把背景音乐 MP3 文件放进这个目录（例如 song.mp3），
然后在 hugo.toml 的 [params.music] 下登记播放列表：

[[params.music.playlist]]
  name   = "歌曲名称"
  artist = "艺术家"
  url    = "/audio/song.mp3"
  cover  = "/images/bg3.jpeg"   # 可选封面

保存后刷新页面，侧边栏「音乐」卡片与导航栏音符按钮即可播放。
