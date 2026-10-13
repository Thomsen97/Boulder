using System.Text.RegularExpressions;

namespace Boulder.Domain.Users;

public enum UsernameError
{
    None,
    TooShort,
    TooLong,
    InvalidCharacters,
    MustStartWithLetter,
    Reserved
}

/// <summary>AUTH-4: 3-20 characters [a-z0-9._], starts with a letter, reserved words blocked, one change per 30 days.</summary>
public static partial class UsernameRules
{
    public const int MinLength = 3;
    public const int MaxLength = 20;
    public const int ChangeIntervalDays = 30;

    public static readonly IReadOnlySet<string> Reserved = new HashSet<string>
    {
        "admin", "administrator", "boulder", "buldring", "help", "hjelp",
        "moderator", "root", "staff", "support", "system", "team"
    };

    [GeneratedRegex("^[a-z0-9._]+$")]
    private static partial Regex AllowedCharacters();

    /// <summary>Usernames are case-insensitive, so input is trimmed and lowercased before it is checked or stored.</summary>
    public static string Normalize(string raw) => raw.Trim().ToLowerInvariant();

    public static UsernameError Validate(string raw)
    {
        var name = Normalize(raw);
        if (name.Length < MinLength) return UsernameError.TooShort;
        if (name.Length > MaxLength) return UsernameError.TooLong;
        if (!AllowedCharacters().IsMatch(name)) return UsernameError.InvalidCharacters;
        if (name[0] is < 'a' or > 'z') return UsernameError.MustStartWithLetter;
        if (Reserved.Contains(name)) return UsernameError.Reserved;
        return UsernameError.None;
    }

    /// <summary>The earliest moment the username may change again, or null when it may change now.</summary>
    public static DateTimeOffset? NextChangeAt(DateTimeOffset? changedAt, DateTimeOffset now)
    {
        if (changedAt is null) return null;
        var next = changedAt.Value.AddDays(ChangeIntervalDays);
        return next > now ? next : null;
    }
}
