using Boulder.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boulder.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public const string UsernameIndex = "ix_users_username";
    public const string AuthSubjectIndex = "ix_users_auth_subject";

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", t =>
        {
            t.HasCheckConstraint("ck_users_role", "role in ('user', 'admin')");
            t.HasCheckConstraint("ck_users_status", "status in ('active', 'suspended', 'deleted')");
            t.HasCheckConstraint("ck_users_spoiler_mode", "spoiler_mode in ('off', 'projects', 'all_unsent')");
        });

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).ValueGeneratedNever();

        builder.Property(u => u.AuthSubject).IsRequired();
        builder.Property(u => u.Username).HasColumnType("citext").IsRequired();
        builder.Property(u => u.DisplayName).HasMaxLength(User.DisplayNameMaxLength).IsRequired();
        builder.Property(u => u.Bio).HasMaxLength(User.BioMaxLength).IsRequired();
        builder.Property(u => u.IsPrivate).HasDefaultValue(false).IsRequired();
        // Sentinel = the DB default: EF treats a value equal to the sentinel as unset. With the CLR default as
        // sentinel, inserting false (or Off) would silently store the DB default instead.
        builder.Property(u => u.ShareAscents).HasDefaultValue(true).HasSentinel(true).IsRequired();
        builder.Property(u => u.GuidelinesVersion).HasMaxLength(User.GuidelinesVersionMaxLength).IsRequired();

        builder.Property(u => u.SpoilerMode)
            .HasConversion(v => v.ToText(), v => UserEnumText.ParseSpoilerMode(v))
            .HasDefaultValue(SpoilerMode.Projects)
            .HasSentinel(SpoilerMode.Projects)
            .IsRequired();
        builder.Property(u => u.Role)
            .HasConversion(v => v.ToText(), v => UserEnumText.ParseRole(v))
            .HasDefaultValue(UserRole.User)
            .IsRequired();
        builder.Property(u => u.Status)
            .HasConversion(v => v.ToText(), v => UserEnumText.ParseStatus(v))
            .HasDefaultValue(UserStatus.Active)
            .IsRequired();

        builder.HasIndex(u => u.AuthSubject).IsUnique().HasDatabaseName(AuthSubjectIndex);
        builder.HasIndex(u => u.Username)
            .IsUnique()
            .HasFilter("status <> 'deleted'")
            .HasDatabaseName(UsernameIndex);
    }
}
