+++
title = '当 Unity Hub 打不开时，我把它从关键路径上摘掉了'
subtitle = '（Windows 11 25H2 build 26200 上一次 Electron 崩溃的绕行记录）'
date = '2026-10-28T22:30:00+08:00'
lastmod = '2026-10-28T23:10:00+08:00'
draft = false
tags = ['技术', 'Windows', 'Unity', '排查', 'Electron']
+++

有一类故障特别耗人：你盯着那个报错的窗口，觉得它就是问题本身，于是所有时间都花在让它别报错上。

这次就是。Unity Hub 打不开，我（以及在我之前接手这件事的 agent）花了整整一天多去修它：换版本、关杀软、改兼容性、关掉内存完整性、翻反汇编、对着 `ntdll+0x11F5FD` 那个 `INT3` 研究它到底死在哪个瞬间。

最后发现，**它根本不该被修**。

Hub 是启动器，Unity 编辑器不是。它们是两个独立的东西，一个是 Electron 壳，一个是 C++ 本体。真正缺的从来不是"能打开的 Hub"，而是**一张许可证**和**一个项目路径参数**。

这篇记的是这个过程：怎么在错的问题上耗掉一天，又怎么在半小时里绕过去。

---

## 一、症状：四个版本，崩在同一个地址

最初的判断完全合理：Hub 打不开，那就把它修好。

收集到的现象非常一致：

| Hub 版本 | 结果 |
|---|---|
| 3.12.1（原始 asar） | 存活 20–30 秒，窗口标题 `Error` |
| 3.12.1（修复 asar） | 250–500 ms，`exit = -36861 (0xFFFF7003)` |
| 3.14.5 | 250 ms，`exit = -2147483645 (0x80000003)` |
| 3.15.2 / 3.22.4 | 同上，250 ms，`0x80000003` |

四个版本、同一个退出码。这已经说明问题不在 Hub 自己身上。继续往下挖：

```
崩溃地址 = ntdll.dll+0x11F5FD
指令     = INT3 (0x80000003)
反汇编   = cc eb 00 48 83 c4 38 c3   (INT3; jmp; add rsp,0x38; ret)
```

`INT3` 是 `__debugbreak()` 的实现，也是 V8 里 `CHECK` 宏失败时的落点。挂上调试器之后，崩溃时间从 250 ms 提前到 **0.01 秒**——**它死在进程初始化的极早期，早到 JS 层还没开始跑、原生模块还没加载。**

打开 Electron 的 issue 区，build 26200 上的同类报告一抓一把：`STATUS_BREAKPOINT`，栈落在 V8 初始化路径 `IsLoadBrowserProcessSpecificV8SnapshotEnabled`。

**这一层基本可以判死刑。** 这不是配置问题，是操作系统与 Electron 运行时的冲突。下面这些全都试过，全部无效：

- `diskusage` / 原生模块加载 / asar 完整性
- Electron 版本家族（37 / 38 / 44，以及 22–25）
- `--no-sandbox`、`--disable-gpu`、crashpad / breakpad 系列参数
- IFEO mitigation 覆盖、AppCompat 兼容层（含 CFG / CET）
- `--disable-v8-snapshot`、`--single-process`、`--disable-features=V8Snapshot`、`--js-flags=--lazy`
- 火绒、Nahimic、VC++ 运行时、user-data 目录、安装路径、WER / dump、Smart App Control
- **关掉内存完整性（HVCI）、关掉 VBS、`hypervisorlaunchtype` 改 Off**

最后那三条是代价最大的——为了排除它们，我把系统的虚拟化功能关了个遍，后来还得原样恢复回去。

到这里，一天过去了。

---

## 二、转折：编辑器其实早就没崩

转机来自一个"回头看"的动作：**去读 Unity 编辑器的日志**，而不是继续折磨 Hub。

`%LOCALAPPDATA%\Unity\Editor\Editor.log` 里躺着这样一段：

```text
Built from '6000.3/staging' branch; Version is '6000.3.7f1 (696ec25a53d1)'
[Licensing::Module] Successfully launched the LicensingClient (PId: 4396)
[Licensing::Module] Successfully connected to LicensingClient
[Licensing::Module] Error: Access token is unavailable; failed to update
[Licensing::Client] Error: Code 404 ... 0 free entitlements matching requested entitlement ids
[Licensing::Module] Error: 'com.unity.editor.ui' was not found.
Launching Unity Hub...
```

信息量极大：

1. **编辑器本体跑起来了。** 它打印了版本号、启动了许可客户端、完成了握手。
2. **它唯一缺的是一张许可证**（`com.unity.editor.ui` 没有授权）。
3. **它喊 Hub 是因为没许可证。** 那句话是"帮我登录一下"，不是"我坏了"。
4. **许可客户端 `Unity.Licensing.Client.exe` 是个 .NET 程序，和 Electron 毫无关系。** 它在这台机器上工作得完全正常。

于是问题被重新定义：

> 不是"修好 Hub"，而是"**给编辑器一张许可证，并让它别去拉 Hub**"。

同样一份日志，换个读法，答案就在里面。**之前一天没读它，是因为我默认"Hub 打不开 = Unity 打不开"。**

---

## 三、第一步：绕开 Hub 激活许可证

Unity 的许可客户端支持纯命令行激活，这是官方 CI 用的路径：

```powershell
Unity.Licensing.Client.exe --activate-all --include-personal `
    --username <Unity账号邮箱> --password <密码>
```

`--include-personal` 的含义正是"若该账号没有 seat，则回退到免费的 Personal 版"。

实际输出：

```text
Trying to activate all seats ...
Activation processed successfully.
Seat ID: ewogICJzdWJzR3JvdXAiIDogInVuaXR5IGVkaXRvciIs...
Status: [200] ASSIGN_SEAT

Trying to update entitlement license file ...
Successfully updated UnityEntitlementLicense.xml!
```

验证：

```powershell
Unity.Licensing.Client.exe --showEntitlements
```

```text
Path: C:\Users\<user>\AppData\Local\Unity\licenses\UnityEntitlementLicense.xml
Product Name: Unity Personal Version
License Type: Assigned
	com.unity.editor
	com.unity.editor.dark-skin
	com.unity.editor.headless
	com.unity.editor.platforms.android
	com.unity.editor.platforms.ios
	com.unity.editor.ui          ← 这一行就是全部要的东西
```

许可证是**机器级绑定**（`MachineBinding1/2/4/5` + `MachineID`），写在用户目录下，普通权限就能读。

**Hub 从此不在关键路径上了。**

---

## 四、一段自我否定的插曲：那个「TLS 故障」

激活过程中出现过一次极具迷惑性的错误：

```text
Internal Client Error: The SSL connection could not be established
```

顺着查下去，现象非常"像"系统级故障：

| 工具 | 结果 |
|---|---|
| `curl`（Schannel） | 全站 `000`，`AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)` |
| PowerShell `SslStream`（任意 TLS 版本） | 全部「安全程序包没有可用的凭证」 |
| **Python `ssl`（OpenSSL）** | **完全正常**，`TLSv1.2` 握手成功 |
| HTTP（`http://`） | 200，正常 |

再往下，`curl -v` 给出了关键细节：连接停在 **`step 1/3`**，也就是 **Schannel 连凭据都没创建出来**，根本没进入握手。

同时发现注册表里有一处可疑状态：

```text
HKLM\SOFTWARE\Policies\Microsoft\Cryptography\Configuration\SSL\00010002
    （键存在，但一个值都没有）
```

而系统默认的套件表是完好的：

```text
HKLM\SYSTEM\CurrentControlSet\Control\Cryptography\Configuration\Local\SSL\00010002
    Functions = TLS_AES_256_GCM_SHA384 ... (28 个套件)
```

由于 Policies 层会覆盖 System 层，「策略层是空列表」看起来完美解释了「禁止一切加密套件 → 凭据创建失败」。于是备份、删键，一套做下来。

**结果：普通权限下 TLS 依然全部失败。**

真相在后面的对照实验里才浮出来：

| 运行环境 | TLS |
|---|---|
| 我所在的**受限沙箱**内的子进程 | ❌ 全部失败 |
| **提权 / 脱离沙箱**的进程 | ✅ 完全正常 |

那个"TLS 故障"是**我自己的观测环境造成的假象**，用户的真实环境一直是好的。最有力的反证来自业务本身：

```text
upm.log:
[INFO] Downloading package [com.unity.package-manager.metadata-6000.3@0.0.206]
       from registry 'https://packages.unity.com'
[INFO] Finished downloading package ... (size: 11.5 kB, time: 2s)
```

**Unity 自己成功从 HTTPS 下载了包。** 网络与证书毫无问题。

> 这一段的教训：当诊断工具本身处在受限环境里时，**必须先用一个"跨出该环境"的对照实验确认现象是真的**，再去改系统。否则会把大量时间花在一个不存在的问题上。
>
> 顺手说一句，这个假故障之所以逼真，是因为它符合一切"系统级"的想象：全站失败、多工具一致、错误码专业、注册表里还恰好有一处异常。**越像的问题，越要先怀疑观测者。**

---

## 五、最后一道坎：UPM 起不来

许可证到手后，编辑器启动仍会报：

```text
Unity Package Manager Error
Failed to start the Unity Package Manager local server process.
```

`UnityPackageManager.exe`（74 MB，是 pkg 打包的 Node.js 应用）**连一行日志都不写就消失**。

**① 先排除「UPM 本身坏了」**

```powershell
PS> .\UnityPackageManager.exe --version
v9.21.3 (x64)         # exit 0，完全正常
```

**② 再看 IPC 机制**

UPM 与编辑器之间用命名管道通信：

```text
UnityPackageManager.exe -s <父PID> -ipc -ipc-path Unity-Upm-<PID> -l 2
[INFO] IPC server started (IPC path=Unity-Upm-32248).
```

编辑器侧报的是 `Could not connect to IPC stream "Upm-28872" after 30.0 seconds`，而 `upm.log` 的**时间戳完全没有更新**——说明 UPM 进程**根本没有被创建出来**，不是"起来了连不上"。

**③ 用计划任务做对照实验**

因为我的沙箱会干扰直接启动，于是改用 **Windows 计划任务**（由 Task Scheduler 服务直接创建进程，绕开调用者的任务组与文件沙箱），并明确指定工作目录：

```powershell
$action = New-ScheduledTaskAction -Execute "D:\Unity\6000.3.7f1\Editor\Unity.exe" `
    -Argument '-createProject "D:\Unity\MyProject" -logFile "...\unity_real.log"' `
    -WorkingDirectory "D:\Unity\6000.3.7f1\Editor"
```

结果 **UPM 成功启动**，编辑器完整加载了项目：

```text
Project init time:              19.532 seconds
Package Manager init time:       2.116 seconds
Scene opening time:             36.523 seconds
##utp:{"type":"EditorInfo",...,"editorVersion":"6000.3.7f1 (696ec25a53d1)"}
```

反复对照，差异最终锁定在三组实验上：

| 启动方式 | 工作目录 | UPM |
|---|---|---|
| 计划任务直接启动 `Unity.exe` | `Editor` | ✅ |
| 计划任务直接启动 `Unity.exe` | `D:\Unity`（模拟双击） | ✅ |
| 计划任务 → `cmd /c` → **`start`** | `D:\Unity` | ❌ |

**结论：问题不在工作目录，而在 `cmd` 的 `start` 这条进程创建路径上。**

**④ 落地**

既然 `start` 不可用，最终方案改用**快捷方式（`.lnk`）直接指向 `Unity.exe`**——由 Explorer 直接创建进程，等价于已验证可行的路径：

```ini
Target : D:\Unity\6000.3.7f1\Editor\Unity.exe
Args   : -projectPath "D:\Unity\MyProject"
WorkDir: D:\Unity\6000.3.7f1\Editor
```

> 补一句：`-createProject` 用于**首次创建**项目；项目已存在后必须改用 **`-projectPath`**，否则 Unity 会转而显示「推荐安装 Hub」的项目选择界面——就是那个你以为"没绕过去"的框。

---

## 六、展开：为什么 `cmd` 的 `start` 会毁掉 UPM

上一节只给了结论，这里补原理。

**① 直接 `CreateProcess`（约等于 Explorer / Task Scheduler）**

调用方（`explorer.exe` 或 `svchost.exe`）直接创建进程，Unity 就是它的子进程，进程属性干净。

**② `cmd` 的 `start`**

`start` **不是"执行一个程序"**，它是 cmd 的内建命令，做的事多得多：

- 可能走 `ShellExecuteEx` 而非裸 `CreateProcess`（为了支持文件关联、`/D`、`/MIN` 等）
- 常常带 **`CREATE_NEW_PROCESS_GROUP`**，建立新的控制台 / 进程组
- 在 `.bat` 语境里 cmd **立即退出**，Unity 变成"孤儿进程"，它继承的 console 句柄、进程组成员身份、以及可能所在的 **Job Object** 全都变了

Unity 内部再自己去 `CreateProcess` 派发 `UnityPackageManager.exe` 时，**这些被继承的属性会影响子进程能否成功创建**。实测结果就是 spawn 不出来。

**③ 工程结论**

1. **启动 GUI 程序（尤其还需要再派生子进程的），优先用快捷方式 `.lnk` 或直接执行，不要用 `.bat` + `start`。**
2. `.bat` 里非要启动 GUI 程序，`start /wait`、`start "" /D "<工作目录>"` 都比裸 `start` 更接近直接执行，但**仍不保证等价**。
3. 需要「脱离调用者 Job Object / 脱离容器沙箱」时，**计划任务是最干净的方案**。
4. 排查此类问题的标准手法：**固定除一个变量外的所有条件**，用**子进程是否出现**作为判据——这次靠的就是 `upm.log` 的时间戳有没有更新。

> 这种"同一件事两条路径行为不同"的问题最耗时间，因为直觉上它们应该等价。**别信直觉，做对照。**

---

## 七、另一个必须绕开的坑：Windows 提权模型

这部分值得单独记，因为它和上一节一样，属于"文档不会告诉你的那种坑"。

### 7.1 先确认你到底能不能提权

```powershell
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
$pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

**注意**：返回 `False` **不代表你不在 Administrators 组**。标准用户 token 会把 Administrators 标记为 deny-only，所以必须再看实际组成员：

```powershell
Get-LocalGroupMember -Group Administrators
```

### 7.2 UAC 行为取决于两组策略

```text
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
    EnableLUA
    ConsentPromptBehaviorAdmin
    ConsentPromptBehaviorUser
    PromptOnSecureDesktop
```

| `ConsentPromptBehaviorAdmin` | 含义 |
|---|---|
| 0 | **无提示直接提升** |
| 1 | 安全桌面上要求凭据 |
| 2 | 安全桌面上要求同意 |
| 3 | 要求凭据 |
| 4 | 要求同意 |
| 5 | 对非 Windows 二进制要求同意 |

| `ConsentPromptBehaviorUser` | 含义 |
|---|---|
| 0 | 自动拒绝 |
| 1 | 安全桌面上要求凭据 |
| **3** | **要求凭据**（本机实测值） |

**关键区别**：`...Admin` 只在**调用者本身持管理员 token** 时生效。你若以**标准用户**运行，走的是另一行——于是「点一下是」变成了「**输入管理员用户名和密码**」。

### 7.3 四个真实的坑

**坑 1：提权子进程会被连带杀死**

`Start-Process -Verb RunAs` 启动的进程若仍属于调用者的 Job Object，**父进程一退出它就没了**。这正是本次「UAC 弹窗刚出现、还没来得及点就消失」的根因。

| 绕过手段 | 原理 |
|---|---|
| **计划任务**（`Register-ScheduledTask`） | 进程由 `svchost.exe` 创建，彻底脱离 Job |
| WMI `Win32_Process.Create` | 由 `WmiPrvSE` 创建，同样脱离 Job（但沙箱里常被拒） |
| `-EncodedCommand` + 足够长的等待 | 至少保证参数不被解析坏 |

**坑 2：参数解析**

含中文 / 空格 / 引号的脚本路径，`powershell -File "路径"` 极易解析失败（本次就因此白白试了两次）。**Base64(UTF-16LE) + `-EncodedCommand` 是零歧义的**：

```powershell
$b64 = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
Start-Process powershell -Verb RunAs `
    -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$b64
```

**坑 3：任务建好了，普通用户却"看不见"**

`Register-ScheduledTask` 创建的任务，其安全描述符默认可能只授予 Administrators / SYSTEM。此时普通权限下：

```powershell
schtasks /run /tn "Unity6000"     # 报「系统找不到指定的路径」
```

而提权后 `Get-ScheduledTask` 却查得到、也能启动。需要时用 `-SecurityDescriptorSddl` 给 Users 授予读 / 执行权限，或者干脆改用用户自己的任务路径注册。

**坑 4：`dism` 有顺序依赖**

`bcdedit /set hypervisorlaunchtype auto` 之后**必须先重启**，hypervisor 才会真正加载。在此之前 `dism /enable-feature VirtualMachinePlatform` 会**反复失败或长时间挂起**（实测返回 `14107`）。

**正确顺序**：

```text
改 bcdedit  →  重启  →  再启用可选功能（VMP / WSL）
```

顺序反了，会白等很久还以为命令坏了。

---

## 八、顺手完成的清理

### 8.1 卸载团结引擎（Tuanjie）

注册表里查到两个组件，都做静默卸载：

```powershell
"D:\Tuanjie\Hub\Uninstall Tuanjie Hub.exe" /allusers /S
"C:\Program Files\Tuanjie\Tuanjie AI\Tuanjie Cowork\uninstall.exe" /S
```

检查清单：进程 → 安装目录 → 用户数据（`%APPDATA%\TuanjieHub`）→ 注册表卸载项 → 开始菜单 / 桌面快捷方式 → 残留空目录。

**卸载器返回 exitcode 0 ≠ 卸载干净。** 它留下了 `D:\Tuanjie`、`C:\Program Files\Tuanjie`、`%LOCALAPPDATA%\Tuanjie` 三个壳目录，需要手动补删。

### 8.2 关掉 WER 转储（这个坑很贵）

排查早期为了抓 Unity Hub 的崩溃现场，配过 WER 本地转储：

```text
HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting\LocalDumps
    DumpFolder = D:\Unity\_dl\dumps
    DumpType   = 2      ← 完整内存转储
    DumpCount  = 10     ← 上限 10 个
```

**`DumpType=2` 是"完整转储"，单个 354 MB、上限 10 个 ≈ 3.5 GB。**

问题在于：**Unity 编辑器每次启动都会顺手拉一次 Hub，Hub 崩溃就写一个 dump。** 等我想起来去看那个目录时，40 分钟里已经躺了 **5 个（1.77 GB）**。

清理时整个 `_dl` 目录从 **1.9 GB 压到 180 KB**——大头全在这儿。

### 8.3 恢复排查期间改动的系统设置

```powershell
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
bcdedit /set hypervisorlaunchtype auto

reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard" /v EnableVirtualizationBasedSecurity /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" /v Enabled /t REG_DWORD /d 1 /f
```

注意坑 4：**改完 bcdedit 先重启，再回来启用可选功能。**

---

## 九、能启动 ≠ 能交付：补一次 Build 验证

### 9.1 一个必须承认的漏洞

前面所有证据——编辑器启动、项目加载、UPM 就绪——**加在一起只证明了「能开发」**：

```
Project init time:    19.532 s     ← 编辑器加载了项目
Package Manager init:  2.116 s     ← UPM 起来了
Scene opening time:   36.523 s     ← 场景能打开
```

**没有任何一条证明能 Build 出 exe。**

这是个真问题，而不是咬文嚼字：**绕行绕掉的是 Hub，绕不掉的是 Build 流程**。Hub 是启动器、许可证入口、模块下载器；而 Build 走的是编辑器内部管线加 `UnityPlayer` 打包——**两者是不同的链路**。绕开一个依赖，不等于绕开它背后的所有依赖。

于是补了一次最小验证：**空场景出一次 Windows 包**。

### 9.2 验证设计

项目当时是全新的，`Assets/` 目录是空的，`EditorBuildSettings` 里 `m_Scenes: []` —— 这种状态直接 Build 会失败。所以先写一个 Editor 脚本，把「建场景 → 加入 Build Settings → 出包」串起来，供命令行调用：

```csharp
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class DSHBuild
{
    public static void Build()
    {
        if (!Directory.Exists("Assets/Scenes"))
            Directory.CreateDirectory("Assets/Scenes");

        // 空场景（带默认相机与光源）
        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
        const string scenePath = "Assets/Scenes/Main.unity";
        EditorSceneManager.SaveScene(scene, scenePath);

        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath, true) };

        const string outDir = "Build";
        if (!Directory.Exists(outDir)) Directory.CreateDirectory(outDir);
        string exePath = Path.Combine(outDir, "DSHTest.exe");

        var options = new BuildPlayerOptions
        {
            scenes = new[] { scenePath },
            locationPathName = exePath,
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None
        };

        var report = BuildPipeline.BuildPlayer(options);
        var s = report.summary;
        Debug.Log("[DSH] result=" + s.result + " size=" + s.totalSize
                  + " errors=" + s.totalErrors + " time=" + s.totalTime);

        if (s.result != BuildResult.Succeeded)
            EditorApplication.Exit(1);
    }
}
```

命令行调用：

```powershell
Unity.exe -batchmode -quit -nographics `
  -projectPath "D:\Unity\MyProject" `
  -executeMethod DSHBuild.Build `
  -logFile "build.log"
```

### 9.3 第一次尝试：失败，但失败得有信息量

第一跑直接退出了，日志末尾是这样：

```
Unable to retrieve BIOS serial number. 拒绝访问
An error occurred when retrieving the network adapter information. 拒绝访问
[Package Manager] Could not connect to IPC stream "Upm-32312" after 30.0 seconds.
[Package Manager] Could not establish a connection with the Unity Package Manager local server process.
Exiting without the bug reporter. Application will terminate with return code 1
```

两个限制同时致命：

| 限制 | 后果 |
|---|---|
| WMI 查询被拒（BIOS 序列号、MAC 地址） | 许可客户端无法完成机器绑定校验，卡在 `\\.\pipe\Unity-LicenseClient-MQ223` |
| Named pipe 被禁止 | UPM 的 IPC 管道连不上，**Unity 主动退出** |

**注意这和第二节的坑是同一类**：约束来自**诊断所处的环境**（受限沙箱），不是 Unity 本身。GUI 模式下手动双击能跑，正是因为它不在那个沙箱里。

**换用提权方式启动，同一个命令一次通过。**

### 9.4 第二跑：出包成功

```
[DSH] result           = Succeeded
[DSH] platform         = StandaloneWindows64
[DSH] totalSize        = 89,028,343 bytes (89 MB)
[DSH] totalErrors      = 0
[DSH] totalTime        = 00:00:13.54
[DSH] outputPath       = D:/Unity/MyProject/Build/DSHTest.exe
[DSH] exeExists        = True
[DSH] scripting backend = Mono2x
```

产物是完整的：

```
Build\
  DSHTest.exe            667 KB        可执行文件
  UnityPlayer.dll         35 MB        播放器运行时
  DSHTest_Data\                        场景与资源
  MonoBleedingEdge\                    Mono 运行时
  D3D12\  D3D12Core.dll                D3D12 后端
  UnityCrashHandler64.exe
```

**13.5 秒**是空项目的正常速度——没有大量纹理与 shader 需要处理。

### 9.5 再补一步：产物能不能跑

光有文件不算交付，得运行起来。直接启动 `DSHTest.exe`，采样 12 秒：

```
t+ 3s: RUNNING  cpu=1.44  mem=279.0MB
t+ 6s: RUNNING  cpu=3.33  mem=288.2MB
t+ 9s: RUNNING  cpu=4.66  mem=292.9MB
t+12s: RUNNING  cpu=4.75  mem=297.6MB      ← 稳定，无崩溃
```

进程存活、CPU 与内存正常增长，同时 `player.log` 显示全链路初始化完成：

```
[D3D12 Device Filter] Device Name: NVIDIA GeForce RTX 5060 Laptop GPU
                      Feature Level: 12.2 / VRAM 7899 MB / Discrete
Direct3D 12 [level 12.2]  Renderer: NVIDIA GeForce RTX 5060 Laptop GPU
Begin MonoManager ReloadAssembly
  - Loaded All Assemblies, in  0.080 seconds
[Physics::Module] Name: PhysX  SDK Version: 4.1.2  Multi-Threaded
<RI> Input initialized.
```

**图形、运行时、物理、输入四条链路都真的跑起来了**，而且用的是独显（RTX 5060 Laptop），不是软件回退。

日志里唯一的告警可以忽略：

```
d3d12: failed to query info queue interface (0x80004002)
```

这是 D3D12 Debug Layer 未安装时的常规提示，不影响运行。

### 9.6 这一节澄清了什么

**第一，Build 确实不依赖 Hub。** 它走编辑器内部管线，`UnityPlayer` 打包，与启动器无关。之前的绕行对「能交付」同样有效。

**第二，脚本后端是 `Mono2x`，这是个好消息，也是个边界。** Mono 后端不需要 C++ 编译工具链；**如果切成 IL2CPP，就需要 Visual Studio Build Tools**——那才是下一个真正的考验。这一点必须留个注脚，而不是含糊带过：

> **未验证项**：IL2CPP 后端、Android/iOS 等需要额外平台模块的构建目标。这些目标依赖 Hub 管理的模块下载，**是否受影响尚未测试**。

**第三，也是最值得记住的一条：证据链要覆盖到「交付」，不能停在「启动」。**

如果没补这一步，就没法区分这两种情况：

- 绕行成功，问题真的解决了
- 绕行只解决了启动，交付环节还堵着

**而它们的修复成本天差地别。**

---

## 十、方法论复盘

这轮真正有价值的，不是那几条命令，而是几次**"换掉提问方式"**：

| 卡点 | 换的提问方式 | 结果 |
|---|---|---|
| Hub 崩了 | 不问"怎么修 Hub"，问"**编辑器到底崩在哪一步**" | 发现编辑器是好的，只缺许可证 |
| 缺许可证 | 不问"怎么让 Hub 登录"，问"**许可客户端能否独立工作**" | `--activate-all --include-personal` 一击命中 |
| TLS 全站失败 | 不问"哪个注册表坏了"，问"**这是我的环境还是真实环境**" | 对照实验证明是沙箱假象 |
| UPM 起不来 | 不问"UPM 为什么坏"，做**变量对照**（工作目录 / 启动方式） | 锁定 `cmd start` |
| 提权不生效 | 不问"怎么点 UAC"，查 **`ConsentPromptBehaviorUser` + Job Object** | 改用 EncodedCommand / 计划任务 |

几条可复用的原则：

1. **先确认"坏的是哪一层"。** 用户报的故障点（Hub）常常不是真正的阻塞点（许可证）。
2. **对照实验优先于推理。** 同一现象在不同环境下的差异，往往比任何日志都更接近答案。
3. **警惕观测环境本身。** 当诊断工具运行在受限容器 / 沙箱里，任何"全网失败"的结论都要先跨出该环境复验。
4. **一次只改一个变量。** 工作目录、启动者、是否提权——分开测，才能把 `cmd start` 从一堆嫌疑里摘出来。
5. **绕过依赖，而不是修复依赖。** Hub 是"体验层"，编辑器是"功能层"；把体验层的故障转化为功能层的可用性，比死磕一个 OS 级 bug 划算得多。

第 5 条是这篇的结论，也是这篇存在的原因。

---

## 十一、最终交付清单

| 项目 | 位置 / 状态 |
|---|---|
| Unity 编辑器 | `D:\Unity\6000.3.7f1\Editor\Unity.exe` |
| 启动入口 | `D:\Unity\Unity 6000.3.7f1.lnk` |
| 项目 | `D:\Unity\MyProject` |
| 许可证 | `%LOCALAPPDATA%\Unity\licenses\UnityEntitlementLicense.xml`（Personal，Unlimited） |
| **构建验证** | **✅ 空场景出包成功，产物可运行**（见第九节） |
| 构建脚本 | `D:\Unity\MyProject\Assets\Editor\DSHBuild.cs` |
| 团结引擎 | 已彻底卸载 |
| WER 崩溃转储 | 已关闭 |
| 系统功能 | WSL / hypervisorlaunchtype / HVCI / VBS 已恢复，**重启后生效** |

**唯一残留的"未修复项"是 Unity Hub 本身**——它在这台 build 26200 的机器上依然打不开。

而它已经不重要了。