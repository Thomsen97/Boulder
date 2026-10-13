namespace Boulder.Application.Common;

public enum FailureKind
{
    Validation,
    NotFound,
    UsernameTaken,
    UsernameChangeTooSoon,
    AlreadyOnboarded
}

/// <param name="Errors">Field name to messages, for <see cref="FailureKind.Validation"/>.</param>
/// <param name="RetryAfter">Earliest time the action may succeed, for <see cref="FailureKind.UsernameChangeTooSoon"/>.</param>
public sealed record Failure(
    FailureKind Kind,
    IReadOnlyDictionary<string, string[]>? Errors = null,
    DateTimeOffset? RetryAfter = null);

public readonly record struct Result<T>(T? Value, Failure? Failure)
{
    public bool IsSuccess => Failure is null;

    public static implicit operator Result<T>(T value) => new(value, null);

    public static implicit operator Result<T>(Failure failure) => new(default, failure);
}
