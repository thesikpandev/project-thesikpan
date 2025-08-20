"""
더식판 Core Models
계층 구조: 본사 → 세척센터 → 배송센터 → 교육기관
"""
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator

# 3.1 기본정보 관리 - 대리점 정보
class Center(models.Model):
    """센터 모델 (본사, 세척센터, 배송센터)"""
    
    CENTER_TYPE_CHOICES = [
        ('HQ', '본사'),
        ('WASH', '세척센터'),
        ('DELIVERY', '배송센터'),
    ]
    
    # 기본 정보
    name = models.CharField('센터명', max_length=100)
    center_type = models.CharField('센터 유형', max_length=10, choices=CENTER_TYPE_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, 
                              related_name='children', verbose_name='상위 센터')
    
    # 대리점 정보 (3.1.1)
    address = models.CharField('주소', max_length=200)
    phone = models.CharField('전화번호', max_length=20)
    business_number = models.CharField('사업자등록번호', max_length=20, unique=True)
    
    # 관리 정보
    is_active = models.BooleanField('활성화', default=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '센터'
        verbose_name_plural = '센터 목록'
        ordering = ['center_type', 'name']
    
    def __str__(self):
        return f"[{self.get_center_type_display()}] {self.name}"
    
    def get_all_children(self):
        """하위 센터 모두 조회 (재귀)"""
        children = list(self.children.all())
        for child in self.children.all():
            children.extend(child.get_all_children())
        return children


class Institution(models.Model):
    """교육기관 모델"""
    
    INSTITUTION_TYPE_CHOICES = [
        ('KINDERGARTEN', '유치원'),
        ('DAYCARE', '어린이집'),
        ('ENGLISH_KINDERGARTEN', '영어유치원'),
        ('OTHER', '기타'),
    ]
    
    # 기본 정보
    name = models.CharField('기관명', max_length=100)
    institution_type = models.CharField('기관 유형', max_length=20, choices=INSTITUTION_TYPE_CHOICES)
    delivery_center = models.ForeignKey(Center, on_delete=models.CASCADE, 
                                       related_name='institutions', verbose_name='배송센터')
    
    # 연락처 정보
    address = models.CharField('주소', max_length=200)
    phone = models.CharField('전화번호', max_length=20)
    contact_person = models.CharField('담당자명', max_length=50)
    contact_phone = models.CharField('담당자 연락처', max_length=20)
    
    # 서비스 정보
    service_start_date = models.DateField('서비스 시작일')
    service_end_date = models.DateField('서비스 종료일', null=True, blank=True)
    
    # 관리 정보
    is_active = models.BooleanField('활성화', default=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '교육기관'
        verbose_name_plural = '교육기관 목록'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_institution_type_display()})"


class Classroom(models.Model):
    """반 모델"""
    
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, 
                                   related_name='classrooms', verbose_name='교육기관')
    name = models.CharField('반 이름', max_length=50)
    capacity = models.IntegerField('정원', default=0)
    
    # 관리 정보
    is_active = models.BooleanField('활성화', default=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    
    class Meta:
        verbose_name = '반'
        verbose_name_plural = '반 목록'
        unique_together = ['institution', 'name']
        ordering = ['institution', 'name']
    
    def __str__(self):
        return f"{self.institution.name} - {self.name}"


class Child(models.Model):
    """아동 모델 (서비스 이용자)"""
    
    # 기본 정보
    name = models.CharField('아동 이름', max_length=50)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, 
                                 related_name='children', verbose_name='반')
    
    # 보호자 정보
    parent_name = models.CharField('보호자 이름', max_length=50)
    parent_phone = models.CharField('보호자 연락처', max_length=20)
    parent_email = models.EmailField('보호자 이메일', blank=True)
    
    # 서비스 정보
    service_count = models.IntegerField('서비스 개수', default=1)  # 3.5.1 라벨지용
    enrollment_date = models.DateField('등록일')
    withdrawal_date = models.DateField('퇴원일', null=True, blank=True)
    
    # 결제 정보 (3.2 자동이체 관리와 연결)
    payment_day = models.IntegerField('출금일', default=25, 
                                     help_text='매월 출금일 (1-31)')
    monthly_fee = models.DecimalField('월 이용료', max_digits=10, decimal_places=0, 
                                     default=30000)
    
    # 상태 정보
    is_active = models.BooleanField('활성화', default=True)
    is_payment_active = models.BooleanField('자동이체 활성화', default=True)
    
    # 관리 정보
    notes = models.TextField('비고', blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '아동'
        verbose_name_plural = '아동 목록'
        ordering = ['classroom', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.classroom})"
    
    @property
    def institution(self):
        """소속 교육기관"""
        return self.classroom.institution
    
    @property
    def delivery_center(self):
        """담당 배송센터"""
        return self.classroom.institution.delivery_center