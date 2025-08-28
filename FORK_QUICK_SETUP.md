# 📅 单日数据自定义功能

> **Fork 用户专用功能** - 将单日数据从"最近 24 小时"改为"今天 00:00 开始"

## 🔧 快速启用

### 步骤 1: 后端修改 (server/index.js)

找到第 285-286 行，注释掉：

```javascript
// const hoursSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
// const hoursUntil = new Date().toISOString();
```

找到第 295-307 行，取消注释：

```javascript
// 获取小时级数据 - 自定义版本：从今天00点开始
const now = new Date();
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0); // 今天00:00:00

// 为了获取足够的历史数据，仍然获取最近3天
const hoursStartDate = new Date(todayStart);
hoursStartDate.setDate(hoursStartDate.getDate() - 2); // 从3天前开始获取

const hoursSince = hoursStartDate.toISOString();
const hoursUntil = now.toISOString();

console.log(
  `    查询小时级数据时间范围（今天00点模式）: ${hoursSince} 到 ${hoursUntil}`
);
console.log(`    今天开始时间: ${todayStart.toISOString()}`);
```

### 步骤 2: 前端修改 (web/src/components/Dashboard.jsx)

找到第 70-71 行，注释掉：

```javascript
// const periodHours = selectedPeriod === '1day' ? 24 : 72;
// periodData = sortedData.slice(-Math.min(sortedData.length, periodHours));
```

找到第 79-99 行，取消注释：

```javascript
if (selectedPeriod === "1day") {
  // 从今天00点开始的单日数据过滤
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0); // 今天00:00:00

  console.log(`过滤单日数据，从 ${todayStart.toISOString()} 开始`);

  periodData = sortedData.filter((d) => {
    const dataTime = new Date(d.dimensions.datetime);
    return dataTime >= todayStart;
  });

  console.log(`过滤后的单日数据: ${periodData.length} 条记录`);
} else {
  // 3天数据保持原逻辑
  periodData = sortedData.slice(-72);
}
```

### 步骤 3: 重启服务

```bash
# 重启后端
cd server && npm start

# 重启前端
cd web && npm start
```

## ✅ 验证效果

- **修改前**: 单日显示"昨天 15:00 ~ 今天 15:00"
- **修改后**: 单日显示"今天 00:00 ~ 当前时间"

查看控制台日志确认功能启用成功。

## 📖 详细说明

请查看 `FORK_CUSTOMIZATION_GUIDE.md` 获取完整使用指南。
