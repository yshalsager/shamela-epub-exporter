import type MDBReaderClass from 'mdb-reader'

let libs_promise: Promise<{MDBReader: typeof MDBReaderClass}> | null = null

export const load_bok_libs = async () => {
    if (libs_promise) return libs_promise
    libs_promise = Promise.all([import('buffer'), import('mdb-reader')]).then(
        ([buffer_module, mdb_module]) => {
            if (!(globalThis as {Buffer?: typeof buffer_module.Buffer}).Buffer) {
                ;(globalThis as {Buffer?: typeof buffer_module.Buffer}).Buffer =
                    buffer_module.Buffer
            }
            return {MDBReader: mdb_module.default}
        },
    )
    return libs_promise
}
