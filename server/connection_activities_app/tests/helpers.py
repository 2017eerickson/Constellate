from relationship_app.models import PartnershipStatus
from relationship_app.tests.helpers import create_partnership, create_user  # noqa: F401


def create_active_partnership(initiator, partner):
    """Create a partnership with status='active'.

    Signals auto-create Stardust, Streak, and MoodSettings.
    """
    return create_partnership(
        initiator, partner, status=PartnershipStatus.ACTIVE,
    )
