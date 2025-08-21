#!/usr/bin/env node
/**
 * 生成package-lock.json文件的辅助脚本
 * 运行方法：node generate-lockfiles.js
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const directories = ['web', 'server'];

console.log('🔄 正在生成package-lock.json文件...\n');

directories.forEach(dir => {
  const dirPath = resolve(process.cwd(), dir);
  
  if (!existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`);
    return;
  }

  try {
    console.log(`📦 处理 ${dir} 目录...`);
    execSync('npm install --package-lock-only', { 
      cwd: dirPath, 
      stdio: 'inherit' 
    });
    console.log(`✅ ${dir}/package-lock.json 已生成\n`);
  } catch (error) {
    console.error(`❌ 处理 ${dir} 失败:`, error.message);
  }
});

console.log('🎉 所有package-lock.json文件生成完成！');
console.log('💡 现在你可以将lock文件提交到git，然后GitHub Actions就能正常运行了。');