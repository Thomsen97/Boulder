namespace Boulder.Domain.Users;

/// <summary>The text form of the user enums, as stored in the database and sent over the API (SPEC 12.1).</summary>
public static class UserEnumText
{
    public static string ToText(this SpoilerMode mode) => mode switch
    {
        SpoilerMode.Off => "off",
        SpoilerMode.Projects => "projects",
        SpoilerMode.AllUnsent => "all_unsent",
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };

    public static bool TryParseSpoilerMode(string? text, out SpoilerMode mode)
    {
        switch (text)
        {
            case "off": mode = SpoilerMode.Off; return true;
            case "projects": mode = SpoilerMode.Projects; return true;
            case "all_unsent": mode = SpoilerMode.AllUnsent; return true;
            default: mode = default; return false;
        }
    }

    public static string ToText(this UserRole role) => role switch
    {
        UserRole.User => "user",
        UserRole.Admin => "admin",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    public static UserRole ParseRole(string text) => text switch
    {
        "user" => UserRole.User,
        "admin" => UserRole.Admin,
        _ => throw new ArgumentOutOfRangeException(nameof(text))
    };

    public static string ToText(this UserStatus status) => status switch
    {
        UserStatus.Active => "active",
        UserStatus.Suspended => "suspended",
        UserStatus.Deleted => "deleted",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static UserStatus ParseStatus(string text) => text switch
    {
        "active" => UserStatus.Active,
        "suspended" => UserStatus.Suspended,
        "deleted" => UserStatus.Deleted,
        _ => throw new ArgumentOutOfRangeException(nameof(text))
    };

    public static SpoilerMode ParseSpoilerMode(string text) =>
        TryParseSpoilerMode(text, out var mode) ? mode : throw new ArgumentOutOfRangeException(nameof(text));
}
