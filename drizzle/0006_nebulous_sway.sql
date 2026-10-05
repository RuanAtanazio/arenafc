CREATE TABLE `tournament_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`name` text NOT NULL,
	`ordinal` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_group_ordinal` ON `tournament_groups` (`tournament_id`,`ordinal`);--> statement-breakpoint
ALTER TABLE `matches` ADD `group_id` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `group_id` text;