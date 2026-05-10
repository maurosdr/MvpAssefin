-- Usuários criados antes da verificação por e-mail: considerar e-mail já confirmado.
UPDATE "users" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
