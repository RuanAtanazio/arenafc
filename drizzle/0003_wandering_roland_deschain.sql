CREATE TABLE `recruitment` (
	`id` text PRIMARY KEY NOT NULL,
	`club_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`position` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recruitment_interest` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interest_post_user` ON `recruitment_interest` (`post_id`,`user_id`);