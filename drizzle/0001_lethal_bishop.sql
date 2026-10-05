ALTER TABLE `tournaments` ADD `prize` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `mode` text DEFAULT 'X1' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `starts_at` text;