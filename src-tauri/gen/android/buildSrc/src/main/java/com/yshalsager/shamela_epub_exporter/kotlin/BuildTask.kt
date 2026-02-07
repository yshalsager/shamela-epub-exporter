import java.io.File
import javax.inject.Inject
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import org.gradle.process.ExecOperations

abstract class BuildTask : DefaultTask() {
    @Input
    var rootDirRel: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @get:Inject
    abstract val execOperations: ExecOperations

    @TaskAction
    fun assemble() {
        val executable = "pnpm"
        try {
            runTauriCli(executable)
        } catch (e: Exception) {
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                // Try different Windows-specific extensions
                val fallbacks = listOf(
                    "$executable.exe",
                    "$executable.cmd",
                    "$executable.bat",
                )
                
                var lastException: Exception = e
                for (fallback in fallbacks) {
                    try {
                        runTauriCli(fallback)
                        return
                    } catch (fallbackException: Exception) {
                        lastException = fallbackException
                    }
                }
                throw lastException
            } else {
                throw e
            }
        }
    }

    fun runTauriCli(exe: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val base_args = listOf("tauri", "android", "android-studio-script")

        execOperations.exec {
            workingDir = File(project.projectDir, rootDirRel)
            executable = exe
            args = buildList {
                addAll(base_args)
                when {
                    project.logger.isEnabled(LogLevel.DEBUG) -> add("-vv")
                    project.logger.isEnabled(LogLevel.INFO) -> add("-v")
                }
                if (release) add("--release")
                addAll(listOf("--target", target))
            }
        }.assertNormalExitValue()
    }
}
