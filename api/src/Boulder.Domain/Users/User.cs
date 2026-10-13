namespace Boulder.Domain.Users;

public class User
{
    public const int DisplayNameMaxLength = 50;
    public const int BioMaxLength = 160;
    public const int GuidelinesVersionMaxLength = 20;
    public const long DefaultStorageQuotaBytes = 500L * 1024 * 1024; // POST-10

    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string AuthSubject { get; set; }
    public required string Username { get; set; }
    public required string DisplayName { get; set; }
    public string Bio { get; set; } = "";
    public Guid? AvatarMediaId { get; set; }
    public bool IsPrivate { get; set; }
    public bool ShareAscents { get; set; } = true;
    public SpoilerMode SpoilerMode { get; set; } = SpoilerMode.Projects;
    public UserRole Role { get; set; } = UserRole.User;
    public UserStatus Status { get; set; } = UserStatus.Active;
    public long StorageQuotaBytes { get; set; } = DefaultStorageQuotaBytes;
    public long StorageUsedBytes { get; set; }
    public DateTimeOffset? UsernameChangedAt { get; set; }
    public DateTimeOffset AgeConfirmedAt { get; set; }
    public required string GuidelinesVersion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
