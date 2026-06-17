from django import template

register = template.Library()

@register.filter
def shortnum(value):
    try:
        num = float(value)
    except:
        return value

    if num >= 1_000_000:
        return f"{num/1_000_000:.1f}M".rstrip('0').rstrip('.')
    if num >= 1_000:
        return f"{num/1_000:.1f}K".rstrip('0').rstrip('.')
    
    return str(int(num)) if num == int(num) else str(num)
