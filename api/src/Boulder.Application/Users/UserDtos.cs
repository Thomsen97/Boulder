using System.ComponentModel.DataAnnotations;

namespace Boulder.Application.Users;

/// <summary>
/// The signed-in user. Before onboarding only <see cref="OnboardingComplete"/> (false) and
/// <see cref="Status"/> are set; every other field is null.
/// </summary>
public sealed record MeDto(
    bool OnboardingComplete,
    string Status,
    Guid? Id,
    string? Username,
    string? DisplayName,
    string? Bio,
    string? AvatarUrl,
    bool? IsPrivate,
    bool? ShareAscents,
    string? SpoilerMode,
    DateTimeOffset? UsernameChangedAt,
    string? GuidelinesVersion);

public sealed record OnboardingRequest(
    [property: Required] string Username,
    [property: Required] string DisplayName,
    bool AgeConfirmed,
    [property: Required] string GuidelinesVersion);

/// <summary>Merge-patch: a field that is absent (null) is left unchanged.</summary>
public sealed record UpdateMeRequest(
    string? DisplayName,
    string? Bio,
    string? Username,
    bool? IsPrivate,
    bool? ShareAscents,
    string? SpoilerMode);

/// <param name="Reason">One of tooShort, tooLong, invalidChars, mustStartWithLetter, reserved, taken; null when available.</param>
public sealed record UsernameAvailabilityDto(bool Available, string? Reason);

public sealed record UserProfileDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Bio,
    string? AvatarUrl,
    bool IsPrivate,
    bool IsOwn,
    int FollowerCount,
    int FollowingCount,
    string FollowState,
    bool CanViewContent);
