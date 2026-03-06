## ADDED Requirements

### Requirement: Automatic redirect on 401
当 API 返回 401 状态码时，系统 SHALL 自动清除 localStorage 中的 auth token 并重定向到 `/login`。

#### Scenario: Token expired during API call
- **WHEN** an API call returns HTTP 401
- **THEN** localStorage auth token is cleared AND browser redirects to `/login`

#### Scenario: No duplicate redirects
- **WHEN** multiple concurrent API calls all return 401
- **THEN** only one redirect to `/login` occurs (not multiple)

### Requirement: Network error toast notification
当 API 调用因网络问题（fetch 抛出 TypeError）失败时，系统 SHALL 显示统一的 toast 错误提示。

#### Scenario: Network disconnected
- **WHEN** an API call fails due to network error (e.g., offline)
- **THEN** a toast notification appears with a network error message

#### Scenario: API error passes through
- **WHEN** an API call returns a non-401 HTTP error (e.g., 400, 403, 500)
- **THEN** the error is thrown to the caller for specific handling (no automatic toast)
