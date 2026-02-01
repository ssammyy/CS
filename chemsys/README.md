# Chemsys Backend

A Spring Boot backend application built with Kotlin, featuring multi-tenancy support, JWT authentication, and PostgreSQL database.

## Features

- **Multi-tenancy**: Complete tenant isolation with automatic tenant context management
- **JWT Authentication**: Secure token-based authentication with tenant information
- **PostgreSQL Database**: Robust database with Flyway migrations
- **Kotlin**: Modern Kotlin 1.9+ with Spring Boot 3.x
- **Maven Build**: Standard Maven build with Kotlin plugin
- **Security**: Spring Security with role-based access control
- **Validation**: Input validation with Bean Validation
- **Actuator**: Health checks and monitoring endpoints

## Prerequisites

- Java 17+
- Maven 3.6+
- PostgreSQL 12+
- Docker (optional, for TestContainers)

## Quick Start

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE chemsys;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE chemsys TO postgres;
```

### 2. Configuration

Update `src/main/resources/application.yml` with your database credentials:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/chemsys
    username: your_username
    password: your_password
```

### 3. Build and Run

```bash
# Build the project
mvn clean compile

# Run the application
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

## API Endpoints

### Authentication

- `POST /auth/login` - User login (returns JWT token)

### Tenants (Admin Only)

- `POST /tenants` - Create new tenant
- `GET /tenants` - List all tenants (paginated)
- `GET /tenants/{id}` - Get tenant by ID

### Users (Tenant-scoped)

- `POST /users` - Create new user
- `GET /users` - List users for current tenant (paginated)
- `GET /users/{id}` - Get user by ID

### Health & Monitoring

- `GET /actuator/health` - Application health check
- `GET /actuator/info` - Application information

## Multi-tenancy

The application supports multi-tenancy through:

1. **Tenant Context**: Thread-local storage of current tenant ID
2. **Header-based Routing**: Use `X-Tenant-ID` header to specify tenant
3. **Automatic Isolation**: All queries are automatically filtered by tenant
4. **JWT Claims**: Tenant ID is embedded in JWT tokens

### Example Usage

```bash
# Set tenant context via header
curl -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000" \
     -H "Authorization: Bearer <jwt_token>" \
     http://localhost:8080/users
```

## Default Credentials

After running migrations, a default admin user is created:

- **Username**: `admin`
- **Password**: `admin123`
- **Tenant**: Default Tenant

## Database Schema

### Tenants Table
- `id` (UUID, PK)
- `name` (VARCHAR, unique)
- `created_at` (TIMESTAMP)

### Users Table
- `id` (UUID, PK)
- `username` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `email` (VARCHAR, unique)
- `tenant_id` (UUID, FK to tenants.id)
- `role` (VARCHAR - ADMIN/USER)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Development

### Project Structure

```
src/main/kotlin/com/chemsys/
├── config/          # Configuration classes
├── controller/      # REST controllers
├── dto/            # Data transfer objects
├── entity/         # JPA entities
├── repository/     # Data repositories
├── security/       # Security configuration
└── service/        # Business logic services
```

### Building

```bash
# Compile
mvn compile

# Run tests
mvn test

# Package
mvn package

# Run with profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Testing

The project includes TestContainers for integration testing:

```bash
mvn test
```

## Security

- **JWT Tokens**: 24-hour expiration
- **Password Hashing**: BCrypt with salt
- **Role-based Access**: ADMIN and USER roles
- **Tenant Isolation**: Complete data separation between tenants
- **Input Validation**: Bean Validation annotations

## Configuration Properties

| Property | Default | Description |
|----------|---------|-------------|
| `spring.security.jwt.secret` | `your-256-bit-secret-key-here-change-in-production` | JWT signing secret |
| `spring.security.jwt.expiration` | `86400000` | JWT expiration in milliseconds |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/chemsys` | Database URL |
| `spring.flyway.enabled` | `true` | Enable Flyway migrations |

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Migration Errors**: Check Flyway logs for SQL syntax issues
3. **Tenant Context**: Verify `X-Tenant-ID` header is set correctly
4. **JWT Issues**: Check token expiration and secret configuration

### Logs

Enable debug logging by setting log level in `application.yml`:

```yaml
logging:
  level:
    com.chemsys: DEBUG
    org.springframework.security: DEBUG
```

## Contributing

1. Follow Kotlin coding conventions
2. Use constructor injection for dependencies
3. Add validation annotations to DTOs
4. Include proper error handling
5. Write tests for new functionality

## License

This project is licensed under the MIT License.
