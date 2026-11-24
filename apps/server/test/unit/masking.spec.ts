import { maskPhone, sanitizeForLog } from '../../src/common/utils/masking.util';

describe('masking.util（NFR-008 日志脱敏）', () => {
  it('手机号保留前 3 后 4', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
    expect(maskPhone('联系人 13812345678 已通知')).toBe('联系人 138****5678 已通知');
  });

  it('敏感字段永不入日志', () => {
    const result = sanitizeForLog({
      name: '张三',
      password: 'secret123',
      passwordHash: 'abc',
      deviceKey: 'dev_123',
      phone: '13812345678',
    });
    expect(result).toContain('张三');
    expect(result).toContain('138****5678');
    expect(result).not.toContain('secret123');
    expect(result).not.toContain('dev_123');
    expect(result).not.toContain('password');
  });

  it('嵌套对象递归脱敏且限制深度', () => {
    const result = sanitizeForLog({ a: { b: { phone: '13812345678' } } });
    expect(result).toContain('138****5678');
    const deep = sanitizeForLog({ a: { b: { c: { phone: '13812345678' } } } });
    expect(deep).toContain('[object]');
    expect(deep).not.toContain('13812345678');
  });
});