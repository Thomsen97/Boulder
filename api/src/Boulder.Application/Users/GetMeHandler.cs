using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public sealed class GetMeHandler(ICurrentUser current)
{
    public MeDto Handle() => current.User?.ToMe()
        ?? new MeDto(false, UserStatus.Active.ToText(), null, null, null, null, null, null, null, null, null, null);
}
