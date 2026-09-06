ALTER TABLE `users` ADD `department` text DEFAULT 'Não definido' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `access_scope` text DEFAULT 'own' NOT NULL;