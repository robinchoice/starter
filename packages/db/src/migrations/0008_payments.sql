CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product" varchar(50) NOT NULL,
	"sats" integer NOT NULL,
	"backend" varchar(10) NOT NULL,
	"invoice_id" varchar(100) NOT NULL,
	"invoice" text NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_backend_invoice_id_unique" UNIQUE("backend","invoice_id"),
	CONSTRAINT "payments_sats" CHECK ("payments"."sats" > 0),
	CONSTRAINT "payments_status" CHECK ("payments"."status" in ('pending', 'paid', 'expired')),
	CONSTRAINT "payments_paid_at" CHECK (("payments"."status" = 'paid') = ("payments"."paid_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;