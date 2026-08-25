# Security and data handling

## 不应提交到仓库的内容

- `.env` 和真实密钥；
- Chrome/Playwright 用户目录；
- Cookie、Token、Local Storage、Login Data；
- SQLite、MySQL、Redis 或 MongoDB 运行数据；
- 真实客户表、评论导出表、触达执行记录；
- 验证码截图、账号告警截图和完整运行日志。

## 发现敏感信息

如果在仓库历史中发现敏感信息，应先撤销对应凭证，再清理 Git 历史。仅删除当前文件不足以消除历史泄露。

