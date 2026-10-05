CREATE TABLE `admin_invites` (
	`email` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
