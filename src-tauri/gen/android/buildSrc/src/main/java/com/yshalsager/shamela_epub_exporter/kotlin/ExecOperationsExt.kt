import org.gradle.api.Action
import org.gradle.process.ExecOperations
import org.gradle.process.ExecSpec

fun ExecOperations.exec(action: ExecSpec.() -> Unit) = exec(Action<ExecSpec> { spec -> spec.action() })
