"""
더식판 Payment Models
3.2 자동이체 관리 (NICEPAY CMS)
3.4 정산관리
"""
from django.db import models
from django.utils import timezone
from core.models import Child, Center
from decimal import Decimal


class CMSMember(models.Model):
    """NICEPAY CMS 회원 정보 (3.2.1 회원상태/출금설정)"""
    
    child = models.OneToOneField(Child, on_delete=models.CASCADE, 
                                related_name='cms_member', verbose_name='아동')
    
    # NICEPAY 회원 정보
    nicepay_member_id = models.CharField('NICEPAY 회원ID', max_length=50, unique=True)
    registration_date = models.DateField('CMS 등록일', auto_now_add=True)
    
    # 은행 계좌 정보
    bank_code = models.CharField('은행코드', max_length=10)
    bank_name = models.CharField('은행명', max_length=50)
    account_number = models.CharField('계좌번호', max_length=50)
    account_holder = models.CharField('예금주명', max_length=50)
    
    # 출금 설정
    payment_day = models.IntegerField('출금일', default=25, 
                                     help_text='매월 출금일 (1-31)')
    monthly_amount = models.DecimalField('월 출금액', max_digits=10, decimal_places=0)
    
    # 상태 정보
    STATUS_CHOICES = [
        ('ACTIVE', '정상'),
        ('PAUSED', '일시정지'),
        ('CANCELLED', '해지'),
        ('PENDING', '승인대기'),
    ]
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # 관리 정보
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = 'CMS 회원'
        verbose_name_plural = 'CMS 회원 목록'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.child.name} - {self.get_status_display()}"


class PaymentTransaction(models.Model):
    """출금 거래 내역 (3.2.2 출금결과조회, 3.2.4 회원별 납부이력)"""
    
    cms_member = models.ForeignKey(CMSMember, on_delete=models.CASCADE, 
                                  related_name='transactions', verbose_name='CMS 회원')
    
    # 거래 정보
    transaction_date = models.DateField('거래일자')
    scheduled_amount = models.DecimalField('예정 금액', max_digits=10, decimal_places=0)
    actual_amount = models.DecimalField('실제 출금액', max_digits=10, decimal_places=0, 
                                       null=True, blank=True)
    
    # 거래 상태
    STATUS_CHOICES = [
        ('SCHEDULED', '출금예정'),
        ('SUCCESS', '출금성공'),
        ('FAILED', '출금실패'),
        ('CANCELLED', '취소'),
        ('REFUNDED', '환불'),
    ]
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    
    # 실패 정보
    failure_reason = models.CharField('실패 사유', max_length=200, blank=True)
    retry_count = models.IntegerField('재시도 횟수', default=0)
    
    # NICEPAY 응답 정보
    nicepay_transaction_id = models.CharField('NICEPAY 거래ID', max_length=100, blank=True)
    nicepay_response = models.JSONField('NICEPAY 응답', null=True, blank=True)
    
    # 처리 정보
    processed_at = models.DateTimeField('처리일시', null=True, blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '출금 거래'
        verbose_name_plural = '출금 거래 목록'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['-transaction_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.cms_member.child.name} - {self.transaction_date} - {self.get_status_display()}"


class UnpaidManagement(models.Model):
    """미납 관리 (3.2.3 미납관리)"""
    
    child = models.ForeignKey(Child, on_delete=models.CASCADE, 
                             related_name='unpaid_records', verbose_name='아동')
    
    # 미납 정보
    unpaid_month = models.DateField('미납월', help_text='YYYY-MM-01 형식')
    unpaid_amount = models.DecimalField('미납금액', max_digits=10, decimal_places=0)
    
    # 미납 상태
    STATUS_CHOICES = [
        ('UNPAID', '미납'),
        ('PARTIAL', '부분납부'),
        ('PAID', '완납'),
        ('EXEMPTED', '면제'),
    ]
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='UNPAID')
    
    # 처리 정보
    paid_amount = models.DecimalField('납부금액', max_digits=10, decimal_places=0, default=0)
    paid_date = models.DateField('납부일', null=True, blank=True)
    
    # 관리 정보
    notes = models.TextField('비고', blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '미납 내역'
        verbose_name_plural = '미납 내역 목록'
        unique_together = ['child', 'unpaid_month']
        ordering = ['-unpaid_month']
    
    def __str__(self):
        return f"{self.child.name} - {self.unpaid_month.strftime('%Y년 %m월')} - {self.unpaid_amount:,}원"
    
    @property
    def remaining_amount(self):
        """잔액"""
        return self.unpaid_amount - self.paid_amount


class Settlement(models.Model):
    """정산 관리 (3.4 정산관리)"""
    
    center = models.ForeignKey(Center, on_delete=models.CASCADE, 
                              related_name='settlements', verbose_name='센터')
    
    # 정산 기간
    settlement_date = models.DateField('정산일')
    settlement_month = models.DateField('정산월', help_text='YYYY-MM-01 형식')
    
    # 정산 금액
    total_children = models.IntegerField('총 이용 아동수', default=0)
    expected_amount = models.DecimalField('예상 정산액', max_digits=12, decimal_places=0)
    collected_amount = models.DecimalField('실제 수금액', max_digits=12, decimal_places=0, default=0)
    
    # 수수료 정보
    commission_rate = models.DecimalField('수수료율(%)', max_digits=5, decimal_places=2, default=10.0)
    commission_amount = models.DecimalField('수수료', max_digits=10, decimal_places=0, default=0)
    net_amount = models.DecimalField('순 정산액', max_digits=12, decimal_places=0, default=0)
    
    # 상태 정보
    STATUS_CHOICES = [
        ('PENDING', '정산예정'),
        ('PROCESSING', '정산중'),
        ('COMPLETED', '정산완료'),
        ('ADJUSTED', '조정됨'),
    ]
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # 관리 정보
    notes = models.TextField('비고', blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    completed_at = models.DateTimeField('정산완료일시', null=True, blank=True)
    
    class Meta:
        verbose_name = '정산'
        verbose_name_plural = '정산 목록'
        unique_together = ['center', 'settlement_month']
        ordering = ['-settlement_date']
        indexes = [
            models.Index(fields=['-settlement_date']),
            models.Index(fields=['center', '-settlement_month']),
        ]
    
    def __str__(self):
        return f"{self.center.name} - {self.settlement_month.strftime('%Y년 %m월')} 정산"
    
    def calculate_commission(self):
        """수수료 계산"""
        self.commission_amount = self.collected_amount * (self.commission_rate / 100)
        self.net_amount = self.collected_amount - self.commission_amount
        return self.net_amount
    
    def save(self, *args, **kwargs):
        if self.collected_amount and not self.net_amount:
            self.calculate_commission()
        super().save(*args, **kwargs)