from app.schemas.health import HealthResponse


class HealthService:
    def check(self) -> HealthResponse:
        return HealthResponse(status="ok")
