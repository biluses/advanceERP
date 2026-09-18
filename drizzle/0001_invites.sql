CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`created_by` text,
	`expires_at` integer NOT NULL,
	`accepted_by` text,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`accepted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_unique` ON `invite` (`token`);--> statement-breakpoint
CREATE INDEX `invite_workspace_idx` ON `invite` (`workspace_id`);