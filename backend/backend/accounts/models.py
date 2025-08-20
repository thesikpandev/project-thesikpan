"""
더식판 Accounts Models
사용자 인증 및 권한 관리
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import Center


class User(AbstractUser):
    """커스텀 사용자 모델"""
    
    USER_TYPE_CHOICES = [
        ('SUPER', '슈퍼관리자'),  # 시스템 전체 관리
        ('HQ', '본사'),          # 본사 직원
        ('CENTER', '센터'),      # 세척/배송센터 직원  
        ('INSTITUTION', '교육기관'),  # 교육기관 담당자
    ]
    
    # 추가 필드
    user_type = models.CharField('사용자 유형', max_length=20, choices=USER_TYPE_CHOICES)
    center = models.ForeignKey(Center, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='users', verbose_name='소속 센터')
    phone = models.CharField('연락처', max_length=20, blank=True)
    
    # 프로필 정보
    department = models.CharField('부서', max_length=50, blank=True)
    position = models.CharField('직책', max_length=50, blank=True)
    
    # 알림 설정
    email_notifications = models.BooleanField('이메일 알림', default=True)
    sms_notifications = models.BooleanField('SMS 알림', default=False)
    
    # 관리 정보
    last_login_ip = models.GenericIPAddressField('마지막 로그인 IP', null=True, blank=True)
    login_count = models.IntegerField('로그인 횟수', default=0)
    
    class Meta:
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
        ordering = ['user_type', 'username']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_user_type_display()})"
    
    def has_center_permission(self, target_center):
        """
        센터 데이터 접근 권한 확인
        - 본사: 전체 데이터 조회 가능
        - 세척센터: 해당 세척센터 및 하위 배송센터 데이터 조회 가능
        - 배송센터: 해당 배송센터 데이터만 조회 가능
        """
        if self.user_type in ['SUPER', 'HQ']:
            return True
        
        if not self.center or not target_center:
            return False
        
        # 자신의 센터
        if self.center == target_center:
            return True
        
        # 하위 센터 확인
        if self.center.center_type == 'WASH':
            return target_center in self.center.get_all_children()
        
        return False
    
    def get_accessible_centers(self):
        """접근 가능한 센터 목록 반환"""
        if self.user_type in ['SUPER', 'HQ']:
            return Center.objects.all()
        
        if not self.center:
            return Center.objects.none()
        
        # 자신의 센터와 하위 센터
        centers = [self.center]
        if self.center.center_type == 'WASH':
            centers.extend(self.center.get_all_children())
        
        return Center.objects.filter(id__in=[c.id for c in centers])


class LoginHistory(models.Model):
    """로그인 이력"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, 
                            related_name='login_history', verbose_name='사용자')
    
    # 로그인 정보
    login_at = models.DateTimeField('로그인 시간', auto_now_add=True)
    logout_at = models.DateTimeField('로그아웃 시간', null=True, blank=True)
    ip_address = models.GenericIPAddressField('IP 주소')
    user_agent = models.CharField('User Agent', max_length=500)
    
    # 세션 정보
    session_key = models.CharField('세션 키', max_length=100, blank=True)
    
    class Meta:
        verbose_name = '로그인 이력'
        verbose_name_plural = '로그인 이력 목록'
        ordering = ['-login_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.login_at}"


class PasswordResetHistory(models.Model):
    """비밀번호 재설정 이력"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                            related_name='password_resets', verbose_name='사용자')
    
    # 재설정 정보
    reset_at = models.DateTimeField('재설정 시간', auto_now_add=True)
    reset_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                related_name='password_resets_done', verbose_name='처리자')
    reason = models.CharField('사유', max_length=200)
    
    class Meta:
        verbose_name = '비밀번호 재설정 이력'
        verbose_name_plural = '비밀번호 재설정 이력 목록'
        ordering = ['-reset_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.reset_at}"