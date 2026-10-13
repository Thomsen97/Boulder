using Boulder.Application.Common;
using Boulder.Domain.Users;

namespace Boulder.Application.Users;

internal static class UserMapping
{
    public static MeDto ToMe(this User user) => new(
        OnboardingComplete: true,
        Status: user.Status.ToText(),
        Id: user.Id,
        Username: user.Username,
        DisplayName: user.DisplayName,
        Bio: user.Bio,
        AvatarUrl: null, // media arrives in phase 11
        IsPrivate: user.IsPrivate,
        ShareAscents: user.ShareAscents,
        SpoilerMode: user.SpoilerMode.ToText(),
        UsernameChangedAt: user.UsernameChangedAt,
        GuidelinesVersion: user.GuidelinesVersion);

    public static string ToReason(this UsernameError error) => error switch
    {
        UsernameError.TooShort => "tooShort",
        UsernameError.TooLong => "tooLong",
        UsernameError.InvalidCharacters => "invalidChars",
        UsernameError.MustStartWithLetter => "mustStartWithLetter",
        UsernameError.Reserved => "reserved",
        _ => throw new ArgumentOutOfRangeException(nameof(error))
    };
}

internal sealed class FieldErrors
{
    private readonly Dictionary<string, string[]> _errors = [];

    public bool Any => _errors.Count > 0;

    public void Add(string field, string message) => _errors[field] = [message];

    public Failure ToFailure() => new(FailureKind.Validation, _errors);
}
