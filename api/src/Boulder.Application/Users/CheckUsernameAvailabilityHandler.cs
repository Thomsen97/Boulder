using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public sealed class CheckUsernameAvailabilityHandler(ICurrentUser current, IUserStore users)
{
    public async Task<UsernameAvailabilityDto> HandleAsync(string name, CancellationToken ct)
    {
        var error = UsernameRules.Validate(name);
        if (error != UsernameError.None)
        {
            return new UsernameAvailabilityDto(false, error.ToReason());
        }

        var taken = await users.IsUsernameTakenAsync(UsernameRules.Normalize(name), current.User?.Id, ct);
        return taken ? new UsernameAvailabilityDto(false, "taken") : new UsernameAvailabilityDto(true, null);
    }
}
