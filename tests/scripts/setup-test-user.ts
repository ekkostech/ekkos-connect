#!/usr/bin/env npx tsx
/**
 * Setup Test User for CI/CD
 *
 * Creates a test user and generates credentials for GitHub Actions
 *
 * Usage:
 *   npx tsx setup-test-user.ts
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SECRET_KEY (service role key)
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqizlqwwytybfqpetwip.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SECRET_KEY) {
  console.error('❌ Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_EMAIL = 'ci-test@ekkos.dev';
const TEST_PASSWORD = crypto.randomBytes(16).toString('hex');

async function main() {
  console.log('🧪 Setting up test user for CI/CD...\n');

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

  let userId: string;

  if (existingUser) {
    console.log(`📧 Test user already exists: ${TEST_EMAIL}`);
    userId = existingUser.id;

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: TEST_PASSWORD,
    });

    if (updateError) {
      console.error('❌ Failed to update password:', updateError.message);
      process.exit(1);
    }
    console.log('🔑 Password updated');
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'CI Test User',
        tier: 'pro', // Give pro tier for testing
      },
    });

    if (createError) {
      console.error('❌ Failed to create user:', createError.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`✅ Created test user: ${TEST_EMAIL}`);
  }

  // 2. Generate API key for hooks
  const apiKey = `hook_${crypto.randomBytes(24).toString('hex')}`;

  // Store API key in database (assuming there's an api_keys table)
  const { error: keyError } = await supabase
    .from('api_keys')
    .upsert({
      user_id: userId,
      key_hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
      key_prefix: apiKey.substring(0, 12),
      name: 'CI Test Key',
      scopes: ['hooks', 'mcp'],
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,name',
    });

  if (keyError) {
    console.log('⚠️  Could not store API key (table may not exist):', keyError.message);
    console.log('   You may need to generate an API key manually from the dashboard.');
  }

  // 3. Generate a session token
  const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  });

  // For actual token, we need to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    console.error('❌ Failed to sign in:', signInError.message);
    process.exit(1);
  }

  const accessToken = signInData.session?.access_token;

  // 4. Output credentials
  console.log('\n' + '='.repeat(60));
  console.log('📋 GITHUB SECRETS TO ADD:');
  console.log('='.repeat(60) + '\n');

  console.log(`EKKOS_TEST_EMAIL=${TEST_EMAIL}`);
  console.log(`EKKOS_TEST_PASSWORD=${TEST_PASSWORD}`);
  console.log(`EKKOS_TEST_USER_ID=${userId}`);
  console.log(`EKKOS_TEST_TOKEN=${accessToken}`);
  console.log(`EKKOS_TEST_API_KEY=${apiKey}`);

  console.log('\n' + '='.repeat(60));
  console.log('📝 Add these to GitHub:');
  console.log('   Settings → Secrets and variables → Actions → New repository secret');
  console.log('='.repeat(60) + '\n');

  // 5. Also output gh cli commands
  console.log('Or use gh cli:\n');
  console.log(`gh secret set EKKOS_TEST_EMAIL --body "${TEST_EMAIL}"`);
  console.log(`gh secret set EKKOS_TEST_PASSWORD --body "${TEST_PASSWORD}"`);
  console.log(`gh secret set EKKOS_TEST_USER_ID --body "${userId}"`);
  console.log(`gh secret set EKKOS_TEST_TOKEN --body "${accessToken}"`);
  console.log(`gh secret set EKKOS_TEST_API_KEY --body "${apiKey}"`);

  console.log('\n✅ Test user setup complete!');
}

main().catch(console.error);
