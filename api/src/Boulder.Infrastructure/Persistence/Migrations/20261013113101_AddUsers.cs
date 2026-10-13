using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boulder.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    auth_subject = table.Column<string>(type: "text", nullable: false),
                    username = table.Column<string>(type: "citext", nullable: false),
                    display_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    bio = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    avatar_media_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_private = table.Column<bool>(type: "boolean", nullable: false),
                    share_ascents = table.Column<bool>(type: "boolean", nullable: false),
                    spoiler_mode = table.Column<string>(type: "text", nullable: false, defaultValue: "projects"),
                    role = table.Column<string>(type: "text", nullable: false, defaultValue: "user"),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "active"),
                    storage_quota_bytes = table.Column<long>(type: "bigint", nullable: false),
                    storage_used_bytes = table.Column<long>(type: "bigint", nullable: false),
                    username_changed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    age_confirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    guidelines_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.CheckConstraint("ck_users_role", "role in ('user', 'admin')");
                    table.CheckConstraint("ck_users_spoiler_mode", "spoiler_mode in ('off', 'projects', 'all_unsent')");
                    table.CheckConstraint("ck_users_status", "status in ('active', 'suspended', 'deleted')");
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_auth_subject",
                table: "users",
                column: "auth_subject",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                table: "users",
                column: "username",
                unique: true,
                filter: "status <> 'deleted'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
