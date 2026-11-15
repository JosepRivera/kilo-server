CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"purchase_interval_days" integer NOT NULL,
	"monthly_spend" numeric(12,2) DEFAULT '0' NOT NULL,
	"critical" boolean NOT NULL,
	CONSTRAINT "categories_restaurant_id_name_unique" UNIQUE("restaurant_id","name"),
	CONSTRAINT "categories_interval_positive" CHECK ("purchase_interval_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"supply_id" uuid NOT NULL,
	"purchased_on" date NOT NULL,
	"quantity" numeric(12,3) NOT NULL,
	"cost" numeric(12,2) NOT NULL,
	"expires_on" date NOT NULL,
	CONSTRAINT "lots_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"closed_weekdays" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_records" (
	"supply_id" uuid,
	"day" date,
	"remaining" numeric(12,3),
	CONSTRAINT "stock_records_pkey" PRIMARY KEY("supply_id","day")
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"restaurant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"shelf_life_days" integer NOT NULL,
	"reference_price" numeric(12,2) NOT NULL,
	"icon" text,
	"critical" boolean NOT NULL,
	CONSTRAINT "supplies_restaurant_id_name_unique" UNIQUE("restaurant_id","name")
);
--> statement-breakpoint
CREATE TABLE "supply_phrases" (
	"supply_id" uuid,
	"phrase" text,
	"amount" numeric(12,3) NOT NULL,
	CONSTRAINT "supply_phrases_pkey" PRIMARY KEY("supply_id","phrase")
);
--> statement-breakpoint
CREATE INDEX "lots_supply_id_purchased_on_index" ON "lots" ("supply_id","purchased_on");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_supply_id_supplies_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_records" ADD CONSTRAINT "stock_records_supply_id_supplies_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "supply_phrases" ADD CONSTRAINT "supply_phrases_supply_id_supplies_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE CASCADE;