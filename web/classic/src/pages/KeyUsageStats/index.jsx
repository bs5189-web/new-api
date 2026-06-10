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

import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Button, Typography, Space, Toast, Input } from '@douyinfe/semi-ui';
import { API, renderQuota } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;
const { Option } = Select;

const TIME_RANGES = [
  { value: '1h', label: '近1小时', seconds: 3600 },
  { value: '6h', label: '近6小时', seconds: 6 * 3600 },
  { value: '1d', label: '近1天', seconds: 24 * 3600 },
  { value: '7d', label: '近7天', seconds: 7 * 24 * 3600 },
  { value: '30d', label: '近30天', seconds: 30 * 24 * 3600 },
  { value: 'all', label: '全部时间', seconds: 0 },
];

const fetchDetails = async (range, username, tokenName) => {
  const now = Math.floor(Date.now() / 1000);
  const rangeConfig = TIME_RANGES.find((r) => r.value === range);
  const startTimestamp = rangeConfig?.seconds ? now - rangeConfig.seconds : 0;
  const params = new URLSearchParams({
    start_timestamp: startTimestamp,
    end_timestamp: now,
  });
  if (username) params.append('username', username);
  if (tokenName) params.append('token_name', tokenName);
  const res = await API.get(`/api/log/stat?${params}`);
  return res.data?.data || {};
};

const KeyUsageStats = () => {
  const { t } = useTranslation();
  const [details, setDetails] = useState([]);
  const [stat, setStat] = useState({ quota: 0, rpm: 0, tpm: 0 });
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1d');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterTokenName, setFilterTokenName] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchTokenName, setSearchTokenName] = useState('');

  const refresh = async (range, uname, tname) => {
    setLoading(true);
    try {
      const data = await fetchDetails(range, uname, tname);
      setStat({ quota: data.quota || 0, rpm: data.rpm || 0, tpm: data.tpm || 0 });
      setDetails(data.details || []);
    } catch (err) {
      console.error('fetch error:', err);
      Toast.error(t('获取数据失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchUsername(filterUsername);
    setSearchTokenName(filterTokenName);
  };

  useEffect(() => {
    refresh(timeRange, searchUsername, searchTokenName);
  }, [timeRange, searchUsername, searchTokenName]);

  const handleReset = () => {
    setFilterUsername('');
    setFilterTokenName('');
    setSearchUsername('');
    setSearchTokenName('');
    setTimeRange('1d');
  };

  const columns = [
    { title: t('用户'), dataIndex: 'username', key: 'username', render: (text, r) => (
      <div><Text strong>{text || '—'}</Text><br /><Text size="small" type="tertiary">ID: {r.user_id || '—'}</Text></div>
    )},
    { title: t('Key'), dataIndex: 'token_name', key: 'token_name', render: (text, r) => (
      <div><Text>{text || '—'}</Text><br /><Text size="small" type="tertiary">ID: {r.token_id || '—'}</Text></div>
    )},
    { title: t('请求数'), dataIndex: 'count', key: 'count', align: 'right', sorter: (a, b) => a.count - b.count, render: (v) => <Text type="tertiary">{v?.toLocaleString()}</Text> },
    { title: 'Prompt', dataIndex: 'prompt_tokens', key: 'prompt_tokens', align: 'right', render: (v) => <Text type="tertiary">{v?.toLocaleString()}</Text> },
    { title: 'Completion', dataIndex: 'completion_tokens', key: 'completion_tokens', align: 'right', render: (v) => <Text type="tertiary">{v?.toLocaleString()}</Text> },
    { title: t('总Tokens'), dataIndex: 'total_tokens', key: 'total_tokens', align: 'right', sorter: (a, b) => a.total_tokens - b.total_tokens, render: (v) => <Text strong>{v?.toLocaleString()}</Text> },
    { title: t('额度'), dataIndex: 'quota', key: 'quota', align: 'right', sorter: (a, b) => a.quota - b.quota, render: (v) => <Text type="tertiary">{renderQuota(v || 0)}</Text> },
  ];

  return (
    <div className="mt-[60px] px-6">
      <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Title heading={4} style={{ margin: 0 }}>{t('Key使用统计')}</Title>
          <Space>
            <Select value={timeRange} onChange={(v) => setTimeRange(v)} style={{ width: 130 }}>
              {TIME_RANGES.map((r) => <Option key={r.value} value={r.value}>{r.label}</Option>)}
            </Select>
          </Space>
        </div>

        {/* Filter Bar */}
        <Card>
          <Space wrap>
            <Input placeholder={t('按用户名筛选')} value={filterUsername} onChange={(v) => setFilterUsername(v)} style={{ width: 180 }} />
            <Input placeholder={t('按Key名称筛选')} value={filterTokenName} onChange={(v) => setFilterTokenName(v)} style={{ width: 180 }} />
            <Button onClick={handleSearch} loading={loading}>{t('查询')}</Button>
            <Button onClick={handleReset} theme="light">{t('重置')}</Button>
          </Space>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, width: '100%' }}>
          <Card><Text size="small" type="tertiary">RPM</Text><Title heading={3} style={{ margin: 0 }}>{loading ? '...' : stat.rpm}</Title></Card>
          <Card><Text size="small" type="tertiary">TPM</Text><Title heading={3} style={{ margin: 0 }}>{loading ? '...' : stat.tpm?.toLocaleString()}</Title></Card>
          <Card><Text size="small" type="tertiary">{t('总额度')}</Text><Title heading={3} style={{ margin: 0 }}>{loading ? '...' : renderQuota(stat.quota || 0)}</Title></Card>
          <Card><Text size="small" type="tertiary">{t('活跃Key')}</Text><Title heading={3} style={{ margin: 0 }}>{loading ? '...' : details.length}</Title></Card>
        </div>

        <Card title={t('Key使用明细')} style={{ width: '100%' }}>
          <Table columns={columns} dataSource={details} rowKey={(r) => `${r.user_id}-${r.token_id}`} loading={loading} pagination={{ pageSize: 20 }} empty={<Text type="tertiary">{t('暂无数据')}</Text>} />
        </Card>
      </Space>
    </div>
  );
};

export default KeyUsageStats;