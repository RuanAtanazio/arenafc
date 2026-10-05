CREATE TABLE `bracket_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`round` integer NOT NULL,
	`slot` integer NOT NULL,
	`home_id` text,
	`away_id` text,
	`winner_id` text,
	`match_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bracket_slot_unique` ON `bracket_slots` (`tournament_id`,`round`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `bracket_match_unique` ON `bracket_slots` (`match_id`);--> statement-breakpoint
ALTER TABLE `matches` ADD `home_penalties` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `away_penalties` integer;--> statement-breakpoint
ALTER TABLE `submissions` ADD `home_penalties` integer;--> statement-breakpoint
ALTER TABLE `submissions` ADD `away_penalties` integer;