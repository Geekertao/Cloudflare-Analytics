import React from 'react';

const CacheStats = ({ 
  totalRequests, 
  totalCachedRequests, 
  totalBytes, 
  totalCachedBytes,
  cacheRequestsRatio,
  cacheBytesRatio,
  formatNumber, 
  formatBytes 
}) => {
  return (
    <div className="cache-stats">
      {/* 请求缓存统计 */}
      <div className="cache-card">
        <h3 className="cache-title">请求缓存统计</h3>
        
        <div className="cache-item">
          <span className="cache-label">已缓存请求：</span>
          <div>
            <span className="cache-value">{formatNumber(totalCachedRequests)}</span>
            <span className="cache-percentage">({cacheRequestsRatio}%)</span>
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${cacheRequestsRatio}%` }}
          ></div>
        </div>
        
        <div className="cache-item">
          <span className="cache-label">未缓存请求：</span>
          <div>
            <span className="cache-value">{formatNumber(totalRequests - totalCachedRequests)}</span>
            <span className="cache-percentage">({(100 - parseFloat(cacheRequestsRatio)).toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* 带宽缓存统计 */}
      <div className="cache-card">
        <h3 className="cache-title">带宽缓存统计</h3>
        
        <div className="cache-item">
          <span className="cache-label">已缓存带宽：</span>
          <div>
            <span className="cache-value">{formatBytes(totalCachedBytes)}</span>
            <span className="cache-percentage">({cacheBytesRatio}%)</span>
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${cacheBytesRatio}%` }}
          ></div>
        </div>
        
        <div className="cache-item">
          <span className="cache-label">未缓存带宽：</span>
          <div>
            <span className="cache-value">{formatBytes(totalBytes - totalCachedBytes)}</span>
            <span className="cache-percentage">({(100 - parseFloat(cacheBytesRatio)).toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheStats;