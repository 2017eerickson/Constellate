from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from user_app.models import User


class AdminDeleteUserView(APIView):
    """
    SUMMARY:        Admin soft-deletes a user account by user ID.
    ENDPOINT:       DELETE /api/v1/users/admin/<int:user_id>/
    AUTHENTICATION: Bearer <access_token> (admin/staff only)
    REQUEST BODY:   None
    RETURN VALUE:   200 with success message
    """
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_active:
            return Response({'message': 'User is already deactivated'})

        user.is_active = False
        user.save(update_fields=['is_active'])

        return Response({'message': f'User {user.email} deactivated successfully'})
