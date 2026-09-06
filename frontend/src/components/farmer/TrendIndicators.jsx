import React from 'react';
import { useTranslation } from 'react-i18next';

export const TrendIndicators = ({ trends }) => {
  const { t } = useTranslation();

  if (!trends) return null;

  const getTrendIcon = (direction) => {
    if (direction === 'UP') return '📈';
    if (direction === 'DOWN') return '📉';
    return '➡️';
  };

  const getDirectionStyle = (direction) => {
    if (direction === 'UP') {
      return {
        background: 'var(--safe-bg, rgba(39, 174, 96, 0.15))',
        color: 'var(--safe, #27ae60)',
        border: '1px solid var(--safe, #27ae60)'
      };
    }
    if (direction === 'DOWN') {
      return {
        background: 'var(--danger-bg, rgba(231, 76, 60, 0.15))',
        color: 'var(--danger, #e74c3c)',
        border: '1px solid var(--danger, #e74c3c)'
      };
    }
    return {
      background: 'var(--warn-bg, rgba(243, 156, 18, 0.15))',
      color: 'var(--warn, #f39c12)',
      border: '1px solid var(--warn, #f39c12)'
    };
  };

  const getConfidenceStyle = (confidence) => {
    const conf = (confidence || '').toLowerCase();
    if (conf === 'high') {
      return { background: '#27ae60', color: '#ffffff' };
    }
    if (conf === 'medium') {
      return { background: '#f39c12', color: '#ffffff' };
    }
    return { background: '#95a5a6', color: '#ffffff' };
  };

  const trendKeys = ['30_day', '60_day'];

  return (
    <div style={{
      marginTop: '24px',
      padding: '20px',
      background: 'var(--bg-l, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--bd, #e2e8f0)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--bd, #e2e8f0)',
        paddingBottom: '12px'
      }}>
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--tx, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            🔮 {t('mi.extended_trends', 'Extended Market Trends')}
          </h3>
          <p style={{
            fontSize: '12px',
            color: 'var(--tx-m, #64748b)',
            margin: '4px 0 0 0'
          }}>
            {t('mi.beyond_horizon', 'Long-term 30 & 60 day directional trend signals')}
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {trendKeys.map((key) => {
          const item = trends[key];
          if (!item) return null;
          const days = key === '30_day' ? 30 : 60;
          const title = key === '30_day'
            ? t('mi.trend_30', '30-Day Trend')
            : t('mi.trend_60', '60-Day Trend');

          return (
            <div key={key} style={{
              background: 'var(--bg-m, #f8fafc)',
              borderRadius: '10px',
              border: '1px solid var(--bd, #e2e8f0)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--tx, #1e293b)',
                    margin: 0
                  }}>
                    {title} ({days} {t('mi.days', 'Days')})
                  </h4>
                  <span style={{ fontSize: '20px' }}>
                    {getTrendIcon(item.direction)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  {/* Direction Badge */}
                  <span style={{
                    ...getDirectionStyle(item.direction),
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '.5px'
                  }}>
                    {item.direction}
                  </span>

                  {/* Confidence Badge */}
                  <span style={{
                    ...getConfidenceStyle(item.confidence),
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '.5px'
                  }}>
                    {t(`mi.confidence_${item.confidence}`, `${item.confidence} confidence`)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrendIndicators;
