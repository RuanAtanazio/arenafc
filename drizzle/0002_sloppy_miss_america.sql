CREATE TABLE `clubs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`game` text NOT NULL,
	`mode` text NOT NULL,
	`platform` text NOT NULL,
	`ea_id` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`roster` text DEFAULT '[]' NOT NULL,
	`crest_key` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `teams` ADD `club_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_key` text;