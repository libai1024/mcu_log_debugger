#!/usr/bin/env python3
"""
为图标添加圆角效果
"""
import sys
import os

# 尝试导入PIL
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("错误: 需要安装 Pillow 库")
    print("请运行: pip3 install --user Pillow")
    sys.exit(1)


def add_rounded_corners(input_path, output_path, radius_percent=22):
    """
    为图片添加圆角
    
    Args:
        input_path: 输入图片路径
        output_path: 输出图片路径
        radius_percent: 圆角半径百分比 (相对于图片宽度)
    """
    # 打开图片
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # 计算圆角半径 (macOS风格约为22%)
    radius = int(min(width, height) * radius_percent / 100)
    
    # 创建圆角遮罩
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # 绘制圆角矩形
    draw.rounded_rectangle([(0, 0), (width, height)], radius=radius, fill=255)
    
    # 应用遮罩
    output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)
    
    # 保存
    output.save(output_path, 'PNG')
    print(f"✓ 已创建圆角图标: {output_path}")


def main():
    # 图标目录
    icons_dir = os.path.join(os.path.dirname(__file__), 'src-tauri', 'icons')
    
    # 需要处理的图标文件
    icon_files = [
        'icon.png',
        '32x32.png',
        '128x128.png',
        '128x128@2x.png',
        'Square30x30Logo.png',
        'Square44x44Logo.png',
        'Square71x71Logo.png',
        'Square89x89Logo.png',
        'Square107x107Logo.png',
        'Square142x142Logo.png',
        'Square150x150Logo.png',
        'Square284x284Logo.png',
        'Square310x310Logo.png',
        'StoreLogo.png',
    ]
    
    print("开始为图标添加圆角效果...")
    print(f"圆角半径: 22% (macOS 风格)")
    print()
    
    for filename in icon_files:
        input_path = os.path.join(icons_dir, filename)
        if os.path.exists(input_path):
            # 备份原文件
            backup_path = input_path.replace('.png', '_original.png')
            if not os.path.exists(backup_path):
                os.rename(input_path, backup_path)
                print(f"✓ 已备份: {filename} -> {os.path.basename(backup_path)}")
            
            # 创建圆角版本
            add_rounded_corners(backup_path, input_path, radius_percent=22)
        else:
            print(f"⚠ 跳过不存在的文件: {filename}")
    
    print()
    print("✓ 所有图标已处理完成!")
    print("提示: 原始图标已备份为 *_original.png")


if __name__ == '__main__':
    main()
