-- CreateTable
CREATE TABLE "client_contacts" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "is_primary" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ruc" VARCHAR(11),
    "dni" VARCHAR(8),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" TEXT,
    "category" VARCHAR(20),
    "notes" TEXT,
    "total_orders" INTEGER DEFAULT 0,
    "active_orders" INTEGER DEFAULT 0,
    "completed_orders" INTEGER DEFAULT 0,
    "total_amount" DECIMAL(10,2) DEFAULT 0,
    "last_order_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50),
    "client" VARCHAR(255),
    "communication_type" VARCHAR(50),
    "communication_date" TIMESTAMP(6),
    "subject" VARCHAR(255),
    "description" TEXT,
    "read" BOOLEAN DEFAULT false,
    "is_internal" BOOLEAN DEFAULT false,
    "created_by" VARCHAR(255),
    "responsible" VARCHAR(255),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50),
    "installation_id" INTEGER,
    "report_type" VARCHAR(20),
    "technician" VARCHAR(255),
    "report_date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "work_description" TEXT,
    "progress_percentage" INTEGER,
    "work_at_height" BOOLEAN DEFAULT false,
    "ats_document" JSONB,
    "ptr_document" JSONB,
    "environmental_aspects_document" JSONB,
    "observations" TEXT,
    "next_tasks" TEXT,
    "creation_time" TIME(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "category" VARCHAR(50),
    "subject" VARCHAR(255),
    "content" TEXT,
    "variables" JSONB,
    "is_predefined" BOOLEAN DEFAULT false,
    "created_by" VARCHAR(255),
    "modification_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_permits" (
    "id" VARCHAR(50) NOT NULL,
    "employee_id" INTEGER,
    "employee_name" VARCHAR(255),
    "permit_type" VARCHAR(20),
    "start_date" DATE,
    "end_date" DATE,
    "days_requested" INTEGER,
    "reason" TEXT,
    "attached_documentation" TEXT,
    "approved_by" VARCHAR(255),
    "approval_date" TIMESTAMP(6),
    "rejected_by" VARCHAR(255),
    "rejection_reason" TEXT,
    "rejection_date" TIMESTAMP(6),
    "update_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "employee_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_report_items" (
    "id" SERIAL NOT NULL,
    "final_report_id" INTEGER NOT NULL,
    "daily_report_id" INTEGER,
    "report_date" DATE,
    "description" TEXT,
    "progress_percentage" INTEGER,
    "technician" VARCHAR(255),
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "final_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reports" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50) NOT NULL,
    "generation_date" TIMESTAMP(6),
    "summary" JSONB,
    "signatures" JSONB,
    "blocked" BOOLEAN DEFAULT false,
    "status" VARCHAR(50) DEFAULT 'pending_technician_signature',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "final_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "client" VARCHAR(255),
    "client_id" INTEGER,
    "address" TEXT,
    "specialty" VARCHAR(50),
    "equipment_type" VARCHAR(100),
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "installation_date" DATE,
    "maintenance_frequency" VARCHAR(50),
    "last_maintenance_date" DATE,
    "next_maintenance_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefix" VARCHAR(4) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_items" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "material_id" INTEGER,
    "material_name" VARCHAR(255),
    "requested_quantity" DECIMAL(10,2),
    "approved_quantity" DECIMAL(10,2),
    "unit" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_requests" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50),
    "technician_id" INTEGER,
    "technician_name" VARCHAR(255),
    "request_date" TIMESTAMP(6),
    "priority" VARCHAR(20) DEFAULT 'normal',
    "observations" TEXT,
    "approval_date" TIMESTAMP(6),
    "approved_by" VARCHAR(255),
    "delivery_date" TIMESTAMP(6),
    "delivered_by" VARCHAR(255),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_id" INTEGER,
    "unit" VARCHAR(20) NOT NULL,
    "current_stock" DECIMAL(10,2) DEFAULT 0,
    "minimum_stock" DECIMAL(10,2) DEFAULT 0,
    "unit_price" DECIMAL(10,2) DEFAULT 0,
    "supplier" VARCHAR(255),
    "warehouse_location" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'available',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "notification_type" VARCHAR(50),
    "title" VARCHAR(255),
    "message" TEXT,
    "read" BOOLEAN DEFAULT false,
    "data" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_photos" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50) NOT NULL,
    "url" TEXT,
    "name" VARCHAR(255),
    "size" INTEGER,
    "category" VARCHAR(100),
    "comment" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "order_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_conditions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "days_term" INTEGER,
    "initial_percentage" DECIMAL(5,2),
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "payment_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_slips" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER,
    "employee_name" VARCHAR(255),
    "year" INTEGER,
    "month" INTEGER,
    "period" VARCHAR(10),
    "total_amount" DECIMAL(10,2),
    "file_url" TEXT,
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "uploaded_by" VARCHAR(255),
    "viewed_by" JSONB,
    "view_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'new',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "payroll_slips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_attachments" (
    "id" SERIAL NOT NULL,
    "permit_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "file_type" VARCHAR(100),
    "size" INTEGER,
    "url" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "permit_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" SERIAL NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "item_type" VARCHAR(20),
    "description" VARCHAR(255),
    "code" VARCHAR(50),
    "quantity" DECIMAL(10,2),
    "unit" VARCHAR(20),
    "unit_price" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "material_description" TEXT,
    "labor_description" TEXT,
    "equipment_service" TEXT,
    "contractor_deliverables" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(50) NOT NULL,
    "client" JSONB,
    "quotation_date" DATE,
    "expiration_date" DATE,
    "validity_days" INTEGER,
    "payment_conditions" VARCHAR(255),
    "profit_margin" DECIMAL(5,2),
    "has_prices_assigned" BOOLEAN DEFAULT false,
    "subtotal" DECIMAL(10,2) DEFAULT 0,
    "tax" DECIMAL(10,2) DEFAULT 0,
    "total" DECIMAL(10,2) DEFAULT 0,
    "prepared_by" VARCHAR(255),
    "approved_by" VARCHAR(255),
    "approval_date" DATE,
    "rejection_reason" TEXT,
    "rejection_date" DATE,
    "observations" TEXT,
    "technical_visit_id" VARCHAR(50),
    "generated_order" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_materials" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "name" VARCHAR(255),
    "quantity" DECIMAL(10,2),
    "unit" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "report_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_photos" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "photo_type" VARCHAR(20),
    "url" TEXT,
    "name" VARCHAR(255),
    "size" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "report_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "color" VARCHAR(20),
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_visit_technicians" (
    "id" SERIAL NOT NULL,
    "visit_id" VARCHAR(50) NOT NULL,
    "technician_id" INTEGER,
    "name" VARCHAR(255),
    "specialty" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "technical_visit_technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_visits" (
    "id" VARCHAR(50) NOT NULL,
    "client" VARCHAR(255),
    "client_id" INTEGER,
    "address" TEXT,
    "contact" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "visit_date" DATE,
    "visit_time" TIME(6),
    "service_type" VARCHAR(100),
    "service_description" TEXT,
    "observations" TEXT,
    "assigned_technician" VARCHAR(255),
    "requested_by" VARCHAR(255),
    "project_name" VARCHAR(255),
    "gps_coordinates" JSONB,
    "estimated_materials" JSONB,
    "required_tools" JSONB,
    "required_personnel" JSONB,
    "personnel_list" JSONB,
    "place_status" JSONB,
    "technician_signature" TEXT,
    "completed_date" TIMESTAMP(6),
    "place_status_registration_date" TIMESTAMP(6),
    "generated_quotation" VARCHAR(50),
    "quotation_generation_date" TIMESTAMP(6),
    "generated_order" VARCHAR(50),
    "order_generation_date" TIMESTAMP(6),
    "approval" JSONB,
    "solpe" VARCHAR(15),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "technical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_request_items" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "tool_id" INTEGER,
    "tool_name" VARCHAR(255),
    "quantity" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "tool_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_requests" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(50),
    "technician_id" INTEGER,
    "technician_name" VARCHAR(255),
    "request_date" TIMESTAMP(6),
    "return_date" TIMESTAMP(6),
    "observations" TEXT,
    "return_observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "tool_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "description" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "value" DECIMAL(10,2),
    "location" VARCHAR(100),
    "assigned_to_user_id" INTEGER,
    "assignment_date" TIMESTAMP(6),
    "admission_date" DATE,
    "created_by" VARCHAR(255),
    "status" VARCHAR(20) DEFAULT 'available',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "phone" VARCHAR(20),
    "dni" VARCHAR(8),
    "address" TEXT,
    "position" VARCHAR(100),
    "specialty" VARCHAR(50),
    "last_activity" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" VARCHAR(50) NOT NULL,
    "client" VARCHAR(255),
    "client_id" INTEGER,
    "service_type" VARCHAR(255),
    "visit_type" VARCHAR(20),
    "technical_visit_id" VARCHAR(50),
    "based_on_technical_visit" BOOLEAN DEFAULT false,
    "description" TEXT,
    "location" TEXT,
    "priority" VARCHAR(20),
    "due_date" DATE,
    "estimated_cost" DECIMAL(10,2),
    "assigned_technician" VARCHAR(255),
    "requested_by" VARCHAR(255),
    "progress_percentage" INTEGER DEFAULT 0,
    "approval_status" VARCHAR(50) DEFAULT 'unassigned',
    "estimation_date" TIMESTAMP(6),
    "approval_date" TIMESTAMP(6),
    "approved_by" VARCHAR(255),
    "rejection_date" TIMESTAMP(6),
    "rejected_by" VARCHAR(255),
    "rejection_reason" TEXT,
    "estimated_materials" JSONB,
    "estimated_time" JSONB,
    "required_tools" JSONB,
    "gps_coordinates" JSONB,
    "project_name" VARCHAR(255),
    "personnel_list" JSONB,
    "purchase_order_number" VARCHAR(50),
    "purchase_order_document" JSONB,
    "first_visit_completed" BOOLEAN DEFAULT false,
    "first_visit_date" DATE,
    "reassignment_date" TIMESTAMP(6),
    "reassigned_by" VARCHAR(255),
    "resources" JSONB,
    "selected_materials" JSONB,
    "selected_tools" JSONB,
    "solpe" VARCHAR(15),
    "resources_update_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_clients_dni" ON "clients"("dni");

-- CreateIndex
CREATE INDEX "idx_clients_ruc" ON "clients"("ruc");

-- CreateIndex
CREATE INDEX "idx_clients_status" ON "clients"("status");

-- CreateIndex
CREATE INDEX "idx_clients_type" ON "clients"("type");

-- CreateIndex
CREATE INDEX "idx_daily_reports_date" ON "daily_reports"("report_date");

-- CreateIndex
CREATE INDEX "idx_daily_reports_installation_id" ON "daily_reports"("installation_id");

-- CreateIndex
CREATE INDEX "idx_daily_reports_order_id" ON "daily_reports"("order_id");

-- CreateIndex
CREATE INDEX "idx_employee_permits_employee_id" ON "employee_permits"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_permits_start_date" ON "employee_permits"("start_date");

-- CreateIndex
CREATE INDEX "idx_employee_permits_status" ON "employee_permits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "installations_code_key" ON "installations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_name_key" ON "material_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_prefix_key" ON "material_categories"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE INDEX "idx_materials_category_id" ON "materials"("category_id");

-- CreateIndex
CREATE INDEX "idx_materials_code" ON "materials"("code");

-- CreateIndex
CREATE INDEX "idx_materials_status" ON "materials"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_read" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("notification_type");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_conditions_name_key" ON "payment_conditions"("name");

-- CreateIndex
CREATE INDEX "idx_payroll_slips_employee_id" ON "payroll_slips"("employee_id");

-- CreateIndex
CREATE INDEX "idx_payroll_slips_period" ON "payroll_slips"("period");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_number_key" ON "quotations"("number");

-- CreateIndex
CREATE INDEX "idx_quotations_number" ON "quotations"("number");

-- CreateIndex
CREATE INDEX "idx_quotations_status" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "idx_quotations_technical_visit_id" ON "quotations"("technical_visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_permissions_role_id_permission_id_key" ON "roles_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_name_key" ON "service_types"("name");

-- CreateIndex
CREATE INDEX "idx_technical_visits_client_id" ON "technical_visits"("client_id");

-- CreateIndex
CREATE INDEX "idx_technical_visits_status" ON "technical_visits"("status");

-- CreateIndex
CREATE INDEX "idx_technical_visits_visit_date" ON "technical_visits"("visit_date");

-- CreateIndex
CREATE UNIQUE INDEX "tools_code_key" ON "tools"("code");

-- CreateIndex
CREATE INDEX "idx_tools_assigned_to_user_id" ON "tools"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_tools_code" ON "tools"("code");

-- CreateIndex
CREATE INDEX "idx_tools_location" ON "tools"("location");

-- CreateIndex
CREATE INDEX "idx_tools_status" ON "tools"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role_id" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_work_orders_approval_status" ON "work_orders"("approval_status");

-- CreateIndex
CREATE INDEX "idx_work_orders_client_id" ON "work_orders"("client_id");

-- CreateIndex
CREATE INDEX "idx_work_orders_date_registration" ON "work_orders"("date_time_registration");

-- CreateIndex
CREATE INDEX "idx_work_orders_purchase_order_number" ON "work_orders"("purchase_order_number");

-- CreateIndex
CREATE INDEX "idx_work_orders_status" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "idx_work_orders_technical_visit_id" ON "work_orders"("technical_visit_id");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_permits" ADD CONSTRAINT "employee_permits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "final_report_items" ADD CONSTRAINT "final_report_items_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "final_report_items" ADD CONSTRAINT "final_report_items_final_report_id_fkey" FOREIGN KEY ("final_report_id") REFERENCES "final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "installations" ADD CONSTRAINT "installations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "material_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_photos" ADD CONSTRAINT "order_photos_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payroll_slips" ADD CONSTRAINT "payroll_slips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "permit_attachments" ADD CONSTRAINT "permit_attachments_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "employee_permits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_technical_visit_id_fkey" FOREIGN KEY ("technical_visit_id") REFERENCES "technical_visits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_materials" ADD CONSTRAINT "report_materials_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "technical_visit_technicians" ADD CONSTRAINT "technical_visit_technicians_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "technical_visits"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "technical_visits" ADD CONSTRAINT "technical_visits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_request_items" ADD CONSTRAINT "tool_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "tool_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_request_items" ADD CONSTRAINT "tool_request_items_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_requests" ADD CONSTRAINT "tool_requests_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_technical_visit_id_fkey" FOREIGN KEY ("technical_visit_id") REFERENCES "technical_visits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
