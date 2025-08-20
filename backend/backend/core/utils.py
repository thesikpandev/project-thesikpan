"""
더식판 Core Utilities
3.5 부가기능 - 라벨지/단체문자
3.6 고객지원
"""
from django.db import models
from accounts.models import User
from core.models import Center, Institution, Classroom, Child


# 3.5.1 라벨지 관리
class LabelPrint(models.Model):
    """라벨 출력 이력"""
    
    center = models.ForeignKey(Center, on_delete=models.CASCADE, 
                              related_name='label_prints', verbose_name='센터')
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE,
                                   related_name='label_prints', verbose_name='교육기관')
    
    # 출력 정보
    print_date = models.DateField('출력일')
    total_count = models.IntegerField('총 출력 수량')
    
    # 라벨 데이터 (JSON으로 저장)
    label_data = models.JSONField('라벨 데이터', help_text='아동별 서비스 개수 포함')
    
    # 출력자 정보
    printed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                  related_name='label_prints', verbose_name='출력자')
    printed_at = models.DateTimeField('출력일시', auto_now_add=True)
    
    class Meta:
        verbose_name = '라벨 출력'
        verbose_name_plural = '라벨 출력 이력'
        ordering = ['-printed_at']
    
    def __str__(self):
        return f"{self.institution.name} - {self.print_date} ({self.total_count}장)"


# 3.5.2 단체 문자
class SMSTemplate(models.Model):
    """SMS 템플릿"""
    
    TEMPLATE_TYPE_CHOICES = [
        ('PAYMENT', '출금 안내'),
        ('UNPAID', '미납 안내'),
        ('SERVICE', '서비스 안내'),
        ('NOTICE', '공지사항'),
        ('CUSTOM', '사용자 정의'),
    ]
    
    name = models.CharField('템플릿명', max_length=100)
    template_type = models.CharField('유형', max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    content = models.TextField('내용', help_text='변수: {name}, {amount}, {date} 등')
    
    # 관리 정보
    is_active = models.BooleanField('활성화', default=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = 'SMS 템플릿'
        verbose_name_plural = 'SMS 템플릿 목록'
        ordering = ['template_type', 'name']
    
    def __str__(self):
        return f"[{self.get_template_type_display()}] {self.name}"


class SMSHistory(models.Model):
    """SMS 발송 이력"""
    
    STATUS_CHOICES = [
        ('PENDING', '대기중'),
        ('SENDING', '발송중'),
        ('SUCCESS', '성공'),
        ('FAILED', '실패'),
    ]
    
    # 발송 정보
    center = models.ForeignKey(Center, on_delete=models.CASCADE,
                              related_name='sms_history', verbose_name='발송 센터')
    template = models.ForeignKey(SMSTemplate, on_delete=models.SET_NULL, null=True,
                                related_name='sms_history', verbose_name='템플릿')
    
    # 수신자 정보
    recipient_count = models.IntegerField('수신자 수')
    recipients = models.JSONField('수신자 목록')
    
    # 메시지 내용
    message = models.TextField('메시지')
    
    # 발송 상태
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='PENDING')
    success_count = models.IntegerField('성공 건수', default=0)
    failed_count = models.IntegerField('실패 건수', default=0)
    
    # 발송자 정보
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                               related_name='sms_sent', verbose_name='발송자')
    sent_at = models.DateTimeField('발송일시', null=True, blank=True)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    
    class Meta:
        verbose_name = 'SMS 발송'
        verbose_name_plural = 'SMS 발송 이력'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.center.name} - {self.recipient_count}명 - {self.get_status_display()}"


# 3.6 고객지원
class FAQ(models.Model):
    """자주 묻는 질문"""
    
    CATEGORY_CHOICES = [
        ('SERVICE', '서비스 이용'),
        ('PAYMENT', '결제/정산'),
        ('SYSTEM', '시스템 사용'),
        ('OTHER', '기타'),
    ]
    
    category = models.CharField('카테고리', max_length=20, choices=CATEGORY_CHOICES)
    question = models.CharField('질문', max_length=200)
    answer = models.TextField('답변')
    
    # 관리 정보
    order = models.IntegerField('순서', default=0)
    is_active = models.BooleanField('활성화', default=True)
    view_count = models.IntegerField('조회수', default=0)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQ 목록'
        ordering = ['category', 'order', '-created_at']
    
    def __str__(self):
        return f"[{self.get_category_display()}] {self.question}"


class QnA(models.Model):
    """Q&A 게시판"""
    
    STATUS_CHOICES = [
        ('PENDING', '답변대기'),
        ('ANSWERED', '답변완료'),
        ('CLOSED', '종료'),
    ]
    
    # 질문 정보
    title = models.CharField('제목', max_length=200)
    content = models.TextField('내용')
    author = models.ForeignKey(User, on_delete=models.CASCADE,
                              related_name='questions', verbose_name='작성자')
    center = models.ForeignKey(Center, on_delete=models.CASCADE,
                              related_name='questions', verbose_name='센터')
    
    # 답변 정보
    answer = models.TextField('답변', blank=True)
    answered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                   related_name='answers', verbose_name='답변자')
    answered_at = models.DateTimeField('답변일시', null=True, blank=True)
    
    # 상태 정보
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_private = models.BooleanField('비공개', default=False)
    view_count = models.IntegerField('조회수', default=0)
    
    # 관리 정보
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = 'Q&A'
        verbose_name_plural = 'Q&A 목록'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"


class ChatSupport(models.Model):
    """실시간 채팅 상담"""
    
    STATUS_CHOICES = [
        ('WAITING', '대기중'),
        ('CHATTING', '상담중'),
        ('COMPLETED', '완료'),
        ('CANCELLED', '취소'),
    ]
    
    # 상담 정보
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                            related_name='chat_supports', verbose_name='상담요청자')
    center = models.ForeignKey(Center, on_delete=models.CASCADE,
                              related_name='chat_supports', verbose_name='센터')
    
    # 상담 내용
    subject = models.CharField('상담 주제', max_length=200)
    chat_log = models.JSONField('채팅 로그', default=list)
    
    # 상담원 정보
    agent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                            related_name='chat_agent', verbose_name='상담원')
    
    # 상태 정보
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='WAITING')
    rating = models.IntegerField('만족도', null=True, blank=True,
                                help_text='1-5점')
    feedback = models.TextField('피드백', blank=True)
    
    # 시간 정보
    started_at = models.DateTimeField('시작시간', auto_now_add=True)
    ended_at = models.DateTimeField('종료시간', null=True, blank=True)
    
    class Meta:
        verbose_name = '채팅 상담'
        verbose_name_plural = '채팅 상담 목록'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.subject} - {self.get_status_display()}"