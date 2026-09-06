CREATE TABLE `handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`sandbox` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `handoffs_sandbox_updated` ON `handoffs` (`sandbox`,`updated`);