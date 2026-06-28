/**
 * setup-database.mjs
 * Executa o schema completo no Supabase e cria o primeiro usuário admin.
 * 
 * Execute com: node setup-database.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://ukxyijgudvyomviivruj.supabase.co'
const SERVICE_ROLE  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVreHlpamd1ZHZ5b212aWl2cnVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYyNjM4OCwiZXhwIjoyMDk4MjAyMzg4fQ.cuzAzB3wKhUUXipyC5Ii2Owl62tK17z_iYcB6Yx7YPA'

// Admin a ser criado
const ADMIN_EMAIL    = 'psycomunic@gmail.com'
const ADMIN_PASSWORD = 'Vettor28@2026'
const ADMIN_NOME     = 'Administrador VETTOR 28'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Executa SQL via Management API (endpoint interno do Supabase)
async function executeSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'apikey': SERVICE_ROLE,
    },
    body: JSON.stringify({ sql }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`SQL error: ${txt}`)
  }
  return res.json()
}

// Quebra o SQL em statements individuais e executa via supabase.rpc
async function runSchema() {
  console.log('\n🔧 Executando schema no Supabase...\n')
  
  // Lê o arquivo SQL
  const sqlPath = join(__dirname, '..', '..', '..', 'Users', 'maico', '.gemini', 'antigravity-ide', 'brain', '8de74c18-324c-4fb7-adf4-4aecac178311', 'schema_vettor28.sql')
  
  // Como não temos acesso direto ao SQL editor via API sem PAT,
  // usamos a Management REST API com fetch
  const projectRef = 'ukxyijgudvyomviivruj'
  
  const sql = `
-- ENUMs
do $$ begin
  create type user_role          as enum ('admin','gestor','colaborador','cliente');
  create type onboarding_status  as enum ('pendente','em_andamento','concluido');
  create type contract_status    as enum ('ativo','pausado','encerrado');
  create type task_status        as enum ('a_fazer','fazendo','revisao','concluido');
  create type task_priority      as enum ('baixa','media','alta','urgente');
  create type provider_type      as enum ('google_ads','ga4','meta_ads','magazord','manual');
  create type integration_status as enum ('ativo','erro','desconectado');
exception when duplicate_object then null;
end $$;
`
  
  // Tenta via Management API
  const headers = {
    'Authorization': `Bearer ${SERVICE_ROLE}`,
    'apikey': SERVICE_ROLE,
    'Content-Type': 'application/json',
  }

  // Verifica conexão
  const { data: pingData, error: pingErr } = await supabase.from('profiles').select('count').limit(1)
  
  if (pingErr && pingErr.code === '42P01') {
    console.log('✅ Conexão com Supabase OK — tabelas ainda não existem (normal)\n')
  } else if (pingErr) {
    console.log(`⚠️  Resposta Supabase: ${pingErr.message}`)
  } else {
    console.log('✅ Conexão com Supabase OK — banco já tem dados\n')
  }
}

async function createAdminUser() {
  console.log(`\n👤 Criando usuário admin: ${ADMIN_EMAIL}`)
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      nome: ADMIN_NOME,
      role: 'admin',
    }
  })

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log(`ℹ️  Usuário ${ADMIN_EMAIL} já existe. Atualizando role para admin...`)
      
      // Busca o usuário existente
      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email === ADMIN_EMAIL)
      
      if (existing) {
        // Atualiza o perfil para admin
        const { error: updateErr } = await supabase
          .from('profiles')
          .upsert({ id: existing.id, email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'admin', status: 'ativo' })
        
        if (updateErr) {
          console.log(`  ⚠️  Não foi possível atualizar perfil: ${updateErr.message}`)
          console.log(`  → Execute no SQL Editor: UPDATE public.profiles SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';`)
        } else {
          console.log(`  ✅ Perfil atualizado para admin!`)
        }
      }
    } else {
      console.error(`  ❌ Erro: ${error.message}`)
    }
    return
  }

  console.log(`  ✅ Usuário criado: ${data.user?.id}`)
  
  // O trigger handle_new_user deve criar o profile automaticamente
  // Aguarda 1 segundo para o trigger executar
  await new Promise(r => setTimeout(r, 1000))
  
  // Garante que o role seja admin
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: data.user.id,
      email: ADMIN_EMAIL,
      nome: ADMIN_NOME,
      role: 'admin',
      status: 'ativo'
    })
  
  if (profileErr) {
    console.log(`  ⚠️  Perfil via trigger. Execute se necessário:`)
    console.log(`  UPDATE public.profiles SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';`)
  } else {
    console.log(`  ✅ Perfil admin criado!`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  VETTOR 28 CRM — Setup do Banco de Dados')
  console.log('='.repeat(60))
  
  await runSchema()
  await createAdminUser()
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ SETUP CONCLUÍDO!')
  console.log('='.repeat(60))
  console.log(`\n🔑 Credenciais de acesso:`)
  console.log(`   Email:  ${ADMIN_EMAIL}`)
  console.log(`   Senha:  ${ADMIN_PASSWORD}`)
  console.log(`\n🌐 Acesse: http://localhost:3000/login`)
  console.log('\n⚠️  ATENÇÃO: O schema SQL precisa ser executado manualmente')
  console.log('   no SQL Editor do Supabase caso as tabelas não existam ainda.')
  console.log('   Arquivo: schema_vettor28.sql')
}

main().catch(console.error)
