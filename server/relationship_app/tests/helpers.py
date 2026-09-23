from relationship_app.models import Partnership, PartnershipStatus, RelationType
from user_app.models import User


def create_user(email='user@example.com', password='SecurePass123!', **kwargs):
    defaults = {'username': email, 'first_name': 'Test', 'is_verified': True}
    defaults.update(kwargs)
    return User.objects.create_user(email=email, password=password, **defaults)


def create_partnership(initiator, partner, status=PartnershipStatus.PENDING,
                       relation='romantic'):
    return Partnership.objects.create(
        initiator=initiator,
        partner=partner,
        status=status,
        relation=relation,
    )
