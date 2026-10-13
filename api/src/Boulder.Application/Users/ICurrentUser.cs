using Boulder.Domain.Users;

namespace Boulder.Application.Users;

/// <summary>
/// The authenticated caller, resolved from the access token on the server (SEC-4). <see cref="User"/> is null
/// until onboarding is complete.
/// </summary>
public interface ICurrentUser
{
    string AuthSubject { get; }

    User? User { get; }
}
