using Boulder.Application.Users;
using Boulder.Application.Visibility;
using Boulder.Infrastructure.Persistence;
using Boulder.Infrastructure.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Boulder.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<BoulderDbContext>(options =>
            options
                .UseNpgsql(connectionString,
                    o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
                .UseSnakeCaseNamingConvention());
        services.AddScoped<IUserStore, UserStore>();
        services.AddScoped<IVisibility, Visibility>();
        return services;
    }
}
