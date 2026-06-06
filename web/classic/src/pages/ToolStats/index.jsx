/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Select, Button, Empty, Banner } from '@douyinfe/semi-ui';
import { RefreshCw, Wrench, Hash, BarChart3, Trophy, ListOrdered, AlertCircle } from 'lucide-react';
import { API } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const TIME_RANGES = [
  { value: '7d', label: '最近7天', seconds: 7 * 24 * 3600 },
  { value: '30d', label: '最近30天', seconds: 30 * 24 * 3600 },
  { value: '90d', label: '最近90天', seconds: 90 * 24 * 3600 },
  { value: 'all', label: '全部时间', seconds: 0 },
];

export default function ToolStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchStats = useCallback(async (range) => {
    setLoading(true);
    setError(false);
    try {
      const now = Math.floor(Date.now() / 1000);
      const rangeConfig = TIME_RANGES.find((r) => r.value === range);
      const startTimestamp = rangeConfig?.seconds ? now - rangeConfig.seconds : 0;

      const res = await API.get(`/api/log/tool_stat?start_timestamp=${startTimestamp}&end_timestamp=${now}`);

      if (res.data?.success && Array.isArray(res.data.data)) {
        setStats(res.data.data);
      } else {
        setStats([]);
        setError(true);
      }
    } catch (err) {
      console.error('Failed to fetch tool stats:', err);
      setStats([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(timeRange);
  }, [timeRange, fetchStats]);

  const totalCount = useMemo(
    () => stats.reduce((sum, s) => sum + s.call_count, 0),
    [stats]
  );

  const uniqueTools = stats.length;
  const topTool = stats[0];
  const topToolProportion = topTool && totalCount > 0
    ? ((topTool.call_count / totalCount) * 100).toFixed(1)
    : '0';

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      render: (text, record, index) => {
        const colors = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-700'];
        const colorClass = index < 3 ? colors[index] : '';
        return (
          <span className={`inline-flex size-5 items-center justify-center rounded text-[11px] font-bold ${colorClass}`}>
            {index + 1}
          </span>
        );
      },
    },
    {
      title: t('工具 / 技能名称'),
      dataIndex: 'tool_name',
      key: 'tool_name',
      render: (text) => (
        <span className="font-mono text-sm font-medium truncate max-w-[400px]">
          {text}
        </span>
      ),
    },
    {
      title: t('调用次数'),
      dataIndex: 'call_count',
      key: 'call_count',
      width: 150,
      align: 'right',
      render: (text) => (
        <span className="font-mono text-sm tabular-nums">
          {text.toLocaleString()}
        </span>
      ),
    },
    {
      title: t('占比'),
      dataIndex: 'proportion',
      key: 'proportion',
      width: 200,
      align: 'right',
      render: (text, record) => {
        const proportion = totalCount > 0 ? (record.call_count / totalCount) * 100 : 0;
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-xs tabular-nums">
              {proportion.toFixed(1)}%
            </span>
            <span className="bg-primary/20 h-1.5 w-12 overflow-hidden rounded-full">
              <span
                className="bg-primary block h-full rounded-full"
                style={{ width: `${Math.min(proportion, 100)}%` }}
              />
            </span>
          </span>
        );
      },
    },
  ];

  const StatCard = ({ icon: Icon, title, value, description }) => (
    <Card className="h-full rounded-xl border shadow-xs">
      <div className="flex min-h-32 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <Icon className="size-3.5 shrink-0" />
            <span className="line-clamp-2 leading-snug">{title}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-foreground font-mono text-2xl font-semibold tracking-tight break-all tabular-nums">
            {value}
          </div>
          <p className="text-muted-foreground/60 text-xs leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Wrench className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">
              {t('技能调用统计')}
            </h1>
            <p className="text-muted-foreground line-clamp-1 text-sm">
              {t('工具 / 技能调用统计')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={timeRange}
            onChange={(v) => setTimeRange(v)}
            style={{ width: 130 }}
          >
            {TIME_RANGES.map((r) => (
              <Option key={r.value} value={r.value}>
                {t(r.label)}
              </Option>
            ))}
          </Select>
          <Button
            icon={<RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchStats(timeRange)}
            disabled={loading}
          >
            {loading ? t('加载中...') : t('刷新')}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Hash}
          title={t('总调用次数')}
          value={loading ? '...' : totalCount.toLocaleString()}
          description={t('选定时间段内的总调用次数')}
        />
        <StatCard
          icon={BarChart3}
          title={t('工具数量')}
          value={loading ? '...' : uniqueTools.toLocaleString()}
          description={t('不同的工具或技能数量')}
        />
        <StatCard
          icon={Trophy}
          title={t('最常用工具')}
          value={loading || !topTool ? '—' : topTool.tool_name}
          description={
            topTool
              ? `${topTool.call_count.toLocaleString()} ${t('次调用')}`
              : t('暂无数据')
          }
        />
        <StatCard
          icon={ListOrdered}
          title={t('最高占比')}
          value={loading ? '...' : `${topToolProportion}%`}
          description={t('最常用工具的调用占比')}
        />
      </div>

      {/* Ranking Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4" />
            {t('调用次数排名')}
          </div>
        }
        headerExtraContent={
          totalCount > 0 && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {t('总计')}: {totalCount.toLocaleString()} {t('次调用')}
            </span>
          )
        }
      >
        {loading && stats.length === 0 ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted/40 h-10 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : error ? (
          <Banner
            type="warning"
            icon={<AlertCircle className="size-8" />}
            description={
              <div className="flex flex-col items-center gap-2">
                <p>{t('数据加载失败')}</p>
                <Button onClick={() => fetchStats(timeRange)}>
                  {t('重试')}
                </Button>
              </div>
            }
          />
        ) : stats.length > 0 ? (
          <Table
            columns={columns}
            dataSource={stats}
            rowKey={(record) => record.tool_name}
            pagination={false}
            scroll={{ y: 500 }}
          />
        ) : (
          <Empty
            image={<Wrench className="size-8 opacity-40" />}
            description={
              <p className="text-muted-foreground">
                {t('未找到工具使用数据。请启用 LOG_REQUEST_TOOLS=true 并发送带有 tools 的请求。')}
              </p>
            }
          />
        )}
      </Card>

      {/* Bottom summary */}
      {stats.length > 0 && (
        <div className="text-muted-foreground/60 flex items-center justify-center gap-1 text-xs">
          <BarChart3 className="size-3" />
          <span>
            {stats.length} {t('个工具')} · {totalCount.toLocaleString()} {t('次调用')}
          </span>
        </div>
      )}
    </div>
  );
}