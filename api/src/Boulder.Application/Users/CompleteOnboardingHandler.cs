using Boulder.Application.Common;
using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public sealed class CompleteOnboardingHandler(ICurrentUser current, IUserStore users, TimeProvider time)
{
    public async Task<Result<MeDto>> HandleAsync(OnboardingRequest request, CancellationToken ct)
    {
        if (current.User is not null)
        {
            return new Failure(FailureKind.AlreadyOnboarded);
        }

        var errors = new FieldErrors();

        var username = UsernameRules.Normalize(request.Username ?? "");
        var usernameError = UsernameRules.Validate(username);
        if (usernameError != UsernameError.None)
        {
            errors.Add("username", usernameError.ToReason());
        }

        var displayName = (request.DisplayName ?? "").Trim();
        if (displayName.Length is 0 or > User.DisplayNameMaxLength)
        {
            errors.Add("displayName", "length");
        }

        if (!request.AgeConfirmed)
        {
            errors.Add("ageConfirmed", "required");
        }

        var guidelinesVersion = (request.GuidelinesVersion ?? "").Trim();
        if (guidelinesVersion.Length is 0 or > User.GuidelinesVersionMaxLength)
        {
            errors.Add("guidelinesVersion", "length");
        }

        if (errors.Any)
        {
            return errors.ToFailure();
        }

        if (await users.IsUsernameTakenAsync(username, null, ct))
        {
            return new Failure(FailureKind.UsernameTaken);
        }

        var now = time.GetUtcNow();
        var user = new User
        {
            AuthSubject = current.AuthSubject,
            Username = username,
            DisplayName = displayName,
            AgeConfirmedAt = now,
            GuidelinesVersion = guidelinesVersion,
            CreatedAt = now
        };
        users.Add(user);

        try
        {
            await users.SaveChangesAsync(ct);
        }
        catch (UserConflictException e)
        {
            // Two requests raced: the unique indexes decide.
            return new Failure(e.Conflict == UserConflict.Username
                ? FailureKind.UsernameTaken
                : FailureKind.AlreadyOnboarded);
        }

        return user.ToMe();
    }
}
